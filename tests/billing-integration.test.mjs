import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

const originalMongoUri = process.env.MONGODB_URI;
const testDatabaseName = `fss_it_${randomUUID().replaceAll("-", "").slice(0, 20)}`;
const testUri = originalMongoUri
  ? originalMongoUri.replace(
      /^(mongodb(?:\+srv)?:\/\/[^/]+)(?:\/[^?]*)?(\?.*)?$/,
      (_match, authority, query = "") =>
        `${authority}/${testDatabaseName}${query}`,
    )
  : null;
const hasTestDatabase = Boolean(
  testUri && testUri !== originalMongoUri && testUri.includes(`/${testDatabaseName}`),
);

let mongoose;
let User;
let Plan;
let AdminAudit;
let Coupon;
let Payment;
let Subscription;
let Notification;
let createDemoEnrollment;
let createDemoBalancePayment;
let ensureSuccessfulPaymentReceipt;
let getActivePlans;
let getBillingData;
let getMemberSubscriptions;
let getMemberSubscriptionDetails;
let getAdminOverview;
let getAdminMembers;
let getAdminSubscriptions;
let getAdminTransactions;
let getAdminMemberDetails;
let isAdministratorRole;
let expireSubscriptions;
let expireSubscriptionRoute;
let connectToDatabase;
let syncClerkUser;
let savePlanRecord;
let deletePlanRecord;
let permanentlyDeleteMember;
let synchronizeClerkUserDeletion;
let member;
let otherMember;
let plan;
let partialSubscriptionId;
let partialEnrollmentKey;
let fullSubscriptionId;

before(async () => {
  if (!hasTestDatabase) {
    return;
  }

  process.env.MONGODB_URI = testUri;
  const mongooseModule = await import("mongoose");
  mongoose = mongooseModule.default;
  const [userModel, planModel, couponModel, paymentModel, subscriptionModel, notificationModel] =
    await Promise.all([
      import("../models/User.js"),
      import("../models/Plan.js"),
      import("../models/Coupon.js"),
      import("../models/Payment.js"),
      import("../models/Subscription.js"),
      import("../models/Notification.js"),
    ]);
  ({ default: AdminAudit } = await import("../models/AdminAudit.js"));
  [User, Plan, Coupon, Payment, Subscription, Notification] = [
    userModel.default,
    planModel.default,
    couponModel.default,
    paymentModel.default,
    subscriptionModel.default,
    notificationModel.default,
  ];

  const [billingService, memberData, adminData, authorization] = await Promise.all([
    import("../features/billing/service.js"),
    import("../features/member/data.js"),
    import("../features/admin/data.js"),
    import("../features/auth/authorization.mjs"),
  ]);
  ({ syncClerkUser } = await import("../features/auth/user-sync.js"));
  ({ savePlanRecord, deletePlanRecord } = await import("../features/admin/plan-management.js"));
  ({
    permanentlyDeleteMember,
    synchronizeClerkUserDeletion,
  } = await import("../features/admin/member-deletion.js"));
  ({ createDemoEnrollment, createDemoBalancePayment, ensureSuccessfulPaymentReceipt } = billingService);
  ({
    getActivePlans,
    getBillingData,
    getMemberSubscriptions,
    getMemberSubscriptionDetails,
  } = memberData);
  ({
    getAdminOverview,
    getAdminMembers,
    getAdminMemberDetails,
    getAdminSubscriptions,
    getAdminTransactions,
  } = adminData);
  ({ isAdministratorRole } = authorization);
  ({ expireSubscriptions } = await import("../features/subscriptions/expiry.js"));
  ({ GET: expireSubscriptionRoute } = await import("../app/api/cron/expire-subscriptions/route.js"));
  ({ connectToDatabase } = await import("../lib/db.js"));
  await connectToDatabase();
  await Promise.all([
    User.init(),
    Plan.init(),
    AdminAudit.init(),
    Coupon.init(),
    Payment.init(),
    Subscription.init(),
    Notification.init(),
  ]);
  member = await User.create({
    clerkUserId: `it-member-${randomUUID()}`,
    name: "Integration Member",
    email: `member-${randomUUID()}@example.test`,
    role: "MEMBER",
  });
  otherMember = await User.create({
    clerkUserId: `it-member-${randomUUID()}`,
    name: "Other Integration Member",
    email: `other-${randomUUID()}@example.test`,
    role: "MEMBER",
  });
  plan = await Plan.create({
    name: `Integration Plan ${randomUUID()}`,
    description: "Isolated integration-test plan.",
    durationMonths: 3,
    baseMonthlyPrice: 10_000,
    discountPercentage: 10,
    benefits: ["Test benefit"],
    allowPartialPayment: true,
    isActive: true,
  });
});

after(async () => {
  if (!mongoose) {
    return;
  }

  try {
    if (
      mongoose.connection.name === testDatabaseName &&
      testDatabaseName.startsWith("fss_it_")
    ) {
      await mongoose.connection.dropDatabase();
    }
  } finally {
    await mongoose.disconnect();
    if (originalMongoUri === undefined) {
      delete process.env.MONGODB_URI;
    } else {
      process.env.MONGODB_URI = originalMongoUri;
    }
  }
});

test(
  "isolated MongoDB membership and payment workflow",
  { skip: hasTestDatabase ? false : "MONGODB_URI is missing or cannot be safely redirected to an isolated test database." },
  async (t) => {
    assert.ok(mongoose);

    await t.test("connects, persists, and retrieves active plan data", async () => {
      const plans = await getActivePlans();
      assert.equal(plans.length, 1);
      assert.equal(String(plans[0]._id), String(plan._id));
      assert.equal(plans[0].baseMonthlyPrice, 10_000);
      assert.equal((await Plan.findById(plan._id).lean().exec()).name, plan.name);
      const [userIndexes, planIndexes, couponIndexes, paymentIndexes] = await Promise.all([
        User.collection.indexes(),
        Plan.collection.indexes(),
        Coupon.collection.indexes(),
        Payment.collection.indexes(),
      ]);
      assert.ok(userIndexes.some((index) => index.key.clerkUserId === 1 && index.unique));
      assert.ok(planIndexes.some((index) => index.key.isActive === 1));
      assert.ok(planIndexes.some((index) => index.key.createdAt === -1));
      assert.ok(couponIndexes.some((index) => index.key.code === 1 && index.unique));
      assert.ok(paymentIndexes.some((index) => index.key.idempotencyKey === 1 && index.unique));

      const duplicateUser = await User.create({
        clerkUserId: member.clerkUserId,
        name: "Duplicate account",
        email: `duplicate-${randomUUID()}@example.test`,
        role: "MEMBER",
      }).catch((error) => error);
      assert.equal(duplicateUser?.code, 11000);
    });

    await t.test("synchronizes Clerk members idempotently and protects admin role assignment", async () => {
      const clerkUserId = `clerk-member-${randomUUID()}`;
      const syncedUserIds = [clerkUserId];
      const createdAt = new Date("2025-01-02T03:04:05.000Z");
      const clerkProfile = {
        id: clerkUserId,
        first_name: "New",
        last_name: "Member",
        email_addresses: [
          { id: "secondary", email_address: "secondary@example.test" },
          { id: "primary", email_address: "New.Member@example.test" },
        ],
        primary_email_address_id: "primary",
        created_at: createdAt.getTime(),
        public_metadata: { role: "ADMIN" },
      };

      try {
        const syncedProfiles = await Promise.all(
          Array.from({ length: 3 }, () =>
            syncClerkUser(clerkProfile, { adminClerkUserId: "clerk-admin" }),
          ),
        );
        const memberProfile = await User.findOne({ clerkUserId }).lean().exec();
        assert.ok(syncedProfiles.every((profile) => String(profile._id) === String(memberProfile._id)));
        assert.equal(memberProfile.name, "New Member");
        assert.equal(memberProfile.email, "new.member@example.test");
        assert.equal(memberProfile.role, "MEMBER");
        assert.equal(memberProfile.registeredAt.toISOString(), createdAt.toISOString());
        assert.equal(await User.countDocuments({ clerkUserId }), 1);

        const adminId = `clerk-admin-${randomUUID()}`;
        const untrustedAdminId = `${adminId}-untrusted`;
        syncedUserIds.push(adminId, untrustedAdminId);
        const adminProfile = await syncClerkUser(
          { ...clerkProfile, id: adminId },
          { adminClerkUserId: adminId },
        );
        assert.equal(adminProfile.role, "ADMIN");
        const memberFromUntrustedId = await syncClerkUser(
          { ...clerkProfile, id: untrustedAdminId },
          { adminClerkUserId: adminId },
        );
        assert.equal(memberFromUntrustedId.role, "MEMBER");
      } finally {
        await User.deleteMany({ clerkUserId: { $in: syncedUserIds } });
      }
    });

    await t.test("creates, edits, deactivates, archives, and safely deletes plans", async () => {
      const suffix = randomUUID();
      const admin = await User.create({
        clerkUserId: `it-plan-admin-${suffix}`,
        name: "Plan Administrator",
        email: `plan-admin-${suffix}@example.test`,
        role: "ADMIN",
      });
      const initialPlan = {
        name: `Managed plan ${suffix}`,
        description: "Created by isolated plan-management test.",
        durationMonths: 3,
        baseMonthlyPrice: 5_000,
        discountPercentage: 0,
        benefits: ["Strength training"],
        allowPartialPayment: true,
        isPopular: false,
        isActive: true,
      };
      const createdPlanIds = [];

      try {
        await assert.rejects(
          savePlanRecord({
            adminUser: member,
            planId: null,
            data: initialPlan,
            reason: "Unauthorized plan create attempt",
          }),
          /Administrator access is required/,
        );

        const planId = await savePlanRecord({
          adminUser: admin,
          planId: null,
          data: initialPlan,
          reason: "Create isolated plan",
        });
        createdPlanIds.push(planId);
        let persistedPlan = await Plan.findById(planId).lean().exec();
        assert.equal(persistedPlan.name, initialPlan.name);
        assert.equal(persistedPlan.baseMonthlyPrice, 5_000);
        assert.deepEqual(persistedPlan.benefits, ["Strength training"]);
        assert.ok((await getActivePlans()).some((record) => String(record._id) === String(planId)));

        const updatedPlan = {
          ...initialPlan,
          name: `Updated plan ${suffix}`,
          durationMonths: 6,
          baseMonthlyPrice: 8_500,
          benefits: ["Strength training", "Mobility sessions"],
          isActive: false,
        };
        await savePlanRecord({
          adminUser: admin,
          planId: String(planId),
          data: updatedPlan,
          reason: "Edit isolated plan",
        });
        persistedPlan = await Plan.findById(planId).lean().exec();
        assert.equal(persistedPlan.name, updatedPlan.name);
        assert.equal(persistedPlan.durationMonths, 6);
        assert.equal(persistedPlan.baseMonthlyPrice, 8_500);
        assert.equal(persistedPlan.isActive, false);
        assert.ok(!(await getActivePlans()).some((record) => String(record._id) === String(planId)));

        await savePlanRecord({
          adminUser: admin,
          planId: String(planId),
          data: { ...updatedPlan, isActive: true },
          reason: "Reactivate isolated plan",
        });
        assert.ok((await getActivePlans()).some((record) => String(record._id) === String(planId)));

        const [historicalSubscription] = await Subscription.create([
          {
            userId: member._id,
            planId,
            status: "ACTIVE",
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 86_400_000),
            totalAmount: 51_000,
            amountPaid: 51_000,
            remainingBalance: 0,
            planNameSnapshot: updatedPlan.name,
            baseMonthlyPriceSnapshot: updatedPlan.baseMonthlyPrice,
            discountPercentageSnapshot: updatedPlan.discountPercentage,
            durationMonthsSnapshot: updatedPlan.durationMonths,
            benefitsSnapshot: updatedPlan.benefits,
          },
        ]);
        assert.equal(
          await deletePlanRecord({
            adminUser: admin,
            planId: String(planId),
            reason: "Archive plan with history",
          }),
          "archived",
        );
        persistedPlan = await Plan.findById(planId).lean().exec();
        assert.equal(persistedPlan.isActive, false);
        assert.equal(
          String((await Subscription.findById(historicalSubscription._id).lean().exec()).planId),
          String(planId),
        );

        const unusedPlanId = await savePlanRecord({
          adminUser: admin,
          planId: null,
          data: { ...initialPlan, name: `Unused plan ${suffix}` },
          reason: "Create plan for safe deletion",
        });
        createdPlanIds.push(unusedPlanId);
        assert.equal(
          await deletePlanRecord({
            adminUser: admin,
            planId: String(unusedPlanId),
            reason: "Delete unused plan",
          }),
          "deleted",
        );
        assert.equal(await Plan.exists({ _id: unusedPlanId }), null);

        const planAudits = await AdminAudit.find({
          entityType: "PLAN",
          entityId: { $in: createdPlanIds },
        }).lean().exec();
        assert.ok(planAudits.some((audit) => audit.action === "PLAN_CREATED"));
        assert.ok(planAudits.some((audit) => audit.action === "PLAN_UPDATED"));
        assert.ok(planAudits.some((audit) => audit.action === "PLAN_ARCHIVED"));
        assert.ok(planAudits.some((audit) => audit.action === "PLAN_DELETED"));
      } finally {
        await Promise.all([
          Subscription.deleteMany({ planId: { $in: createdPlanIds } }),
          AdminAudit.deleteMany({ entityId: { $in: createdPlanIds } }),
          Plan.deleteMany({ _id: { $in: createdPlanIds } }),
          User.deleteOne({ _id: admin._id }),
        ]);
      }
    });

    await t.test("validates and applies percentage and flat coupons", async () => {
      const percentCoupon = await Coupon.create({
        code: `ITPCT${randomUUID().replaceAll("-", "").slice(0, 10)}`,
        discountType: "PERCENTAGE",
        discountValue: 20,
        expiryDate: new Date(Date.now() + 86_400_000),
        usageLimit: 1,
        usageCount: 0,
        minimumPurchaseAmount: 1,
        isActive: true,
      });
      const validQuote = 21_600;
      const percentKey = randomUUID();
      const percentEnrollment = {
        userId: member._id,
        planId: plan._id,
        paymentType: "FULL",
        amount: 0,
        paymentMethod: "UPI",
        couponCode: percentCoupon.code,
        idempotencyKey: percentKey,
        quoteTotalPaise: validQuote,
      };
      fullSubscriptionId = await createDemoEnrollment(percentEnrollment);
      assert.equal(
        String(await createDemoEnrollment(percentEnrollment)),
        String(fullSubscriptionId),
      );
      const fullSubscription = await Subscription.findById(fullSubscriptionId).lean().exec();
      assert.equal(fullSubscription.totalAmount, validQuote);
      assert.equal(fullSubscription.amountPaid, validQuote);
      assert.equal(fullSubscription.remainingBalance, 0);
      assert.equal(fullSubscription.status, "ACTIVE");
      assert.equal(fullSubscription.baseMonthlyPriceSnapshot, plan.baseMonthlyPrice);
      assert.equal(fullSubscription.discountPercentageSnapshot, plan.discountPercentage);
      assert.equal(fullSubscription.couponCodeSnapshot, percentCoupon.code);
      assert.equal(fullSubscription.couponDiscountPaiseSnapshot, 5_400);
      assert.match(fullSubscription.invoiceNumber, /^INV-\d{4}-[A-F0-9]{16}$/);
      assert.equal(fullSubscription.planAmountBeforeDiscountSnapshot, 30_000);
      assert.equal(fullSubscription.planDiscountPaiseSnapshot, 3_000);
      assert.equal((await Coupon.findById(percentCoupon._id).lean().exec()).usageCount, 1);
      const percentPayment = await Payment.findOne({ idempotencyKey: percentKey }).lean().exec();
      assert.equal(percentPayment.couponCodeSnapshot, percentCoupon.code);
      assert.equal(percentPayment.couponDiscountPaiseSnapshot, 5_400);
      assert.equal(percentPayment.amount, validQuote);
      assert.match(percentPayment.receiptNumber, /^RCP-\d{4}-[A-F0-9]{16}$/);
      assert.equal(percentPayment.totalSubscriptionAmountSnapshot, validQuote);
      assert.equal(percentPayment.totalPaidAfterPaymentSnapshot, validQuote);
      assert.equal(percentPayment.paymentStatus, "SUCCEEDED");
      assert.equal(percentPayment.memberSnapshot.memberId, String(member._id));
      assert.equal(percentPayment.memberSnapshot.email, member.email);
      assert.equal(percentPayment.memberSnapshot.name, member.name);
      assert.equal(
        String(await createDemoEnrollment(percentEnrollment)),
        String(fullSubscriptionId),
      );
      assert.equal(await Payment.countDocuments({ idempotencyKey: percentKey }), 1);
      assert.equal(
        await Payment.countDocuments({ receiptNumber: percentPayment.receiptNumber }),
        1,
      );
      assert.equal(
        (await getAdminTransactions({ search: percentPayment.receiptNumber })).totalCount,
        1,
      );
      assert.equal(
        (await getAdminTransactions({ search: fullSubscription.invoiceNumber })).totalCount,
        1,
      );
      await Plan.updateOne(
        { _id: plan._id },
        { $set: { baseMonthlyPrice: 12_000, discountPercentage: 15 } },
      );
      const unchangedSnapshot = await Subscription.findById(fullSubscriptionId).lean().exec();
      assert.equal(unchangedSnapshot.baseMonthlyPriceSnapshot, 10_000);
      assert.equal(unchangedSnapshot.discountPercentageSnapshot, 10);
      await Plan.updateOne(
        { _id: plan._id },
        { $set: { baseMonthlyPrice: 10_000, discountPercentage: 10 } },
      );
      const populated = await Subscription.findById(fullSubscriptionId)
        .populate("userId", "email")
        .populate("planId", "name")
        .lean()
        .exec();
      assert.equal(populated.userId.email, member.email);
      assert.equal(populated.planId.name, plan.name);

      const flatCoupon = await Coupon.create({
        code: `ITFLAT${randomUUID().replaceAll("-", "").slice(0, 10)}`,
        discountType: "FLAT",
        discountValue: 500,
        expiryDate: new Date(Date.now() + 86_400_000),
        minimumPurchaseAmount: 1,
        isActive: true,
      });
      assert.equal(flatCoupon.discountValue, 500);
      assert.ok(await Coupon.findById(flatCoupon._id).exec());
      const flatSubscriptionId = await createDemoEnrollment({
        userId: otherMember._id,
        planId: plan._id,
        paymentType: "FULL",
        amount: 0,
        paymentMethod: "UPI",
        couponCode: flatCoupon.code,
        idempotencyKey: randomUUID(),
        quoteTotalPaise: 26_500,
      });
      const flatSubscription = await Subscription.findById(flatSubscriptionId).lean().exec();
      assert.equal(flatSubscription.totalAmount, 26_500);
      assert.equal(flatSubscription.couponDiscountPaiseSnapshot, 500);
      const flatPayment = await Payment.findOne({
        subscriptionId: flatSubscriptionId,
      }).lean().exec();
      assert.equal(flatPayment.couponCodeSnapshot, flatCoupon.code);
      assert.equal(flatPayment.couponDiscountPaiseSnapshot, 500);
      assert.ok(flatPayment.receiptNumber);
    });

    await t.test("rejects invalid, expired, and exhausted coupons without saving a payment", async () => {
      const expiredCoupon = await Coupon.create({
        code: `ITEXP${randomUUID().replaceAll("-", "").slice(0, 10)}`,
        discountType: "FLAT",
        discountValue: 100,
        expiryDate: new Date(Date.now() - 86_400_000),
        minimumPurchaseAmount: 1,
        isActive: true,
      });
      const exhaustedCoupon = await Coupon.create({
        code: `ITUSED${randomUUID().replaceAll("-", "").slice(0, 10)}`,
        discountType: "PERCENTAGE",
        discountValue: 5,
        expiryDate: new Date(Date.now() + 86_400_000),
        usageLimit: 1,
        usageCount: 1,
        minimumPurchaseAmount: 1,
        isActive: true,
      });
      const inactiveCoupon = await Coupon.create({
        code: `ITOFF${randomUUID().replaceAll("-", "").slice(0, 10)}`,
        discountType: "PERCENTAGE",
        discountValue: 5,
        expiryDate: new Date(Date.now() + 86_400_000),
        minimumPurchaseAmount: 1,
        isActive: false,
      });
      const minimumCoupon = await Coupon.create({
        code: `ITMIN${randomUUID().replaceAll("-", "").slice(0, 10)}`,
        discountType: "FLAT",
        discountValue: 100,
        expiryDate: new Date(Date.now() + 86_400_000),
        minimumPurchaseAmount: 27_001,
        isActive: true,
      });

      for (const couponCode of [
        "NO_SUCH_COUPON",
        expiredCoupon.code,
        exhaustedCoupon.code,
        inactiveCoupon.code,
        minimumCoupon.code,
      ]) {
        await assert.rejects(
          createDemoEnrollment({
            userId: member._id,
            planId: plan._id,
            paymentType: "FULL",
            amount: 0,
            paymentMethod: "UPI",
            couponCode,
            idempotencyKey: randomUUID(),
            quoteTotalPaise: 1,
          }),
          /not valid|price changed/i,
        );
      }
      assert.equal(await Payment.countDocuments({ userId: member._id }), 1);
    });

    await t.test("applies coupon once to partial enrollment and never to the remaining balance", async () => {
      const coupon = await Coupon.create({
        code: `ITPART${randomUUID().replaceAll("-", "").slice(0, 10)}`,
        discountType: "PERCENTAGE",
        discountValue: 10,
        expiryDate: new Date(Date.now() + 86_400_000),
        usageLimit: 1,
        usageCount: 0,
        minimumPurchaseAmount: 1,
        isActive: true,
      });
      const partialKey = randomUUID();
      const subscriptionId = await createDemoEnrollment({
        userId: member._id,
        planId: plan._id,
        paymentType: "PARTIAL",
        amount: 7_000,
        paymentMethod: "UPI",
        couponCode: coupon.code,
        idempotencyKey: partialKey,
        quoteTotalPaise: 24_300,
      });
      const subscription = await Subscription.findById(subscriptionId).lean().exec();
      assert.equal(subscription.totalAmount, 24_300);
      assert.equal(subscription.amountPaid, 7_000);
      assert.equal(subscription.remainingBalance, 17_300);
      assert.equal(subscription.couponCodeSnapshot, coupon.code);
      assert.equal(subscription.couponDiscountPaiseSnapshot, 2_700);
      assert.match(subscription.invoiceNumber, /^INV-\d{4}-[A-F0-9]{16}$/);

      const initialPayment = await Payment.findOne({
        idempotencyKey: partialKey,
      }).lean().exec();
      assert.equal(initialPayment.couponCodeSnapshot, coupon.code);
      assert.equal(initialPayment.couponDiscountPaiseSnapshot, 2_700);
      assert.ok(initialPayment.receiptNumber);
      assert.equal(initialPayment.totalPaidAfterPaymentSnapshot, 7_000);
      assert.equal(initialPayment.remainingBalanceAfterPayment, 17_300);
      assert.equal(
        (await getAdminTransactions({
          search: initialPayment.receiptNumber,
          status: "PARTIAL",
        })).totalCount,
        1,
      );

      await createDemoBalancePayment({
        userId: member._id,
        subscriptionId,
        amount: 17_300,
        paymentMethod: "CARD",
        idempotencyKey: randomUUID(),
      });
      const settledSubscription = await Subscription.findById(subscriptionId).lean().exec();
      assert.equal(settledSubscription.totalAmount, 24_300);
      assert.equal(settledSubscription.amountPaid, 24_300);
      assert.equal(settledSubscription.remainingBalance, 0);
      const balancePayment = await Payment.findOne({
        subscriptionId,
        idempotencyKey: { $ne: partialKey },
      }).lean().exec();
      assert.equal(balancePayment.couponCodeSnapshot, null);
      assert.equal(balancePayment.couponDiscountPaiseSnapshot, 0);
      assert.ok(balancePayment.receiptNumber);
      assert.equal(balancePayment.totalPaidAfterPaymentSnapshot, 24_300);
      assert.equal(balancePayment.remainingBalanceAfterPayment, 0);
      assert.notEqual(balancePayment.receiptNumber, initialPayment.receiptNumber);
      const unchangedInitialReceipt = await Payment.findById(initialPayment._id)
        .lean()
        .exec();
      assert.equal(unchangedInitialReceipt.receiptNumber, initialPayment.receiptNumber);
      assert.equal(unchangedInitialReceipt.amount, 7_000);
      const initialPaymentSubscription = await Subscription.findById(
        initialPayment.subscriptionId,
      )
        .select("invoiceNumber")
        .lean()
        .exec();
      const balancePaymentSubscription = await Subscription.findById(
        balancePayment.subscriptionId,
      )
        .select("invoiceNumber")
        .lean()
        .exec();
      assert.equal(initialPaymentSubscription.invoiceNumber, balancePaymentSubscription.invoiceNumber);
      assert.equal(
        (await getAdminTransactions({
          search: balancePayment.receiptNumber,
          status: "COMPLETED",
        })).totalCount,
        1,
      );
      assert.equal((await Coupon.findById(coupon._id).lean().exec()).usageCount, 1);
    });

    await t.test("backfills legacy successful partial payments missing receipt metadata", async () => {
      const legacySubscription = await Subscription.create({
        userId: member._id,
        planId: plan._id,
        status: "PARTIAL",
        startDate: new Date("2026-11-01T00:00:00.000Z"),
        endDate: new Date("2027-02-01T00:00:00.000Z"),
        totalAmount: 250_000,
        amountPaid: 150_000,
        remainingBalance: 100_000,
        planNameSnapshot: "Silver",
        invoiceNumber: null,
        invoiceIssuedAt: null,
        planAmountBeforeDiscountSnapshot: 250_000,
        planDiscountPaiseSnapshot: 0,
        baseMonthlyPriceSnapshot: 250_000,
        discountPercentageSnapshot: 0,
        durationMonthsSnapshot: 3,
        couponCodeSnapshot: "GOLD500",
        couponDiscountPaiseSnapshot: 50_000,
      });
      const legacyPayment = await Payment.create({
        userId: member._id,
        subscriptionId: legacySubscription._id,
        memberSnapshot: null,
        amount: 50_000,
        paymentStatus: "SUCCEEDED",
        isDemoPayment: true,
        paymentMethod: "UPI",
        transactionReference: `LEGACY-${randomUUID()}`,
        totalSubscriptionAmountSnapshot: null,
        totalPaidAfterPaymentSnapshot: null,
        remainingBalanceAfterPayment: null,
        paymentDate: new Date("2026-11-06T15:48:08.073Z"),
      });

      let repaired;
      try {
        repaired = await ensureSuccessfulPaymentReceipt(legacyPayment._id);
        const refreshedSubscription = await Subscription.findById(legacySubscription._id).lean().exec();
        const billingData = await getBillingData(member._id, { status: "all", search: "", page: 1, pageSize: 50 });
        const billingPayment = billingData.payments.find((payment) => String(payment._id) === String(legacyPayment._id));
        assert.ok(repaired.receiptNumber);
        assert.equal(repaired.receiptNumber.startsWith("RCP-"), true);
        assert.ok(refreshedSubscription.invoiceNumber);
        assert.equal(refreshedSubscription.invoiceNumber.startsWith("INV-"), true);
        assert.equal(repaired.memberSnapshot.memberId, String(member._id));
        assert.ok(repaired.memberSnapshot.email || repaired.memberSnapshot.name);
        assert.equal(repaired.totalSubscriptionAmountSnapshot, 250_000);
        assert.equal(repaired.totalPaidAfterPaymentSnapshot, 150_000);
        assert.equal(repaired.remainingBalanceAfterPayment, 100_000);
        assert.equal(repaired.couponCodeSnapshot, "GOLD500");
        assert.equal(repaired.couponDiscountPaiseSnapshot, 50_000);
        assert.ok(billingPayment?.receiptNumber);
        assert.equal((await ensureSuccessfulPaymentReceipt(legacyPayment._id)).receiptNumber, repaired.receiptNumber);
      } finally {
        await Promise.all([
          Payment.deleteOne({ _id: legacyPayment._id }),
          Subscription.deleteOne({ _id: legacySubscription._id }),
        ]);
      }
    });

    await t.test("pending and failed payments have no paid receipt", async () => {
      const subscription = await Subscription.findOne({ userId: member._id })
        .select("_id")
        .lean()
        .exec();
      assert.ok(subscription);
      const failedPayment = await Payment.create({
        userId: member._id,
        subscriptionId: subscription._id,
        amount: 100,
        paymentStatus: "FAILED",
        paymentMethod: "UPI",
        transactionReference: `FAILED-${randomUUID()}`,
      });
      assert.equal(failedPayment.receiptNumber, undefined);
      assert.equal(failedPayment.receiptIssuedAt, null);
      await Payment.deleteOne({ _id: failedPayment._id });
      const pendingPayment = await Payment.create({
        userId: member._id,
        subscriptionId: subscription._id,
        amount: 100,
        paymentStatus: "PENDING",
        paymentMethod: "UPI",
        transactionReference: `PENDING-${randomUUID()}`,
      });
      assert.equal(pendingPayment.receiptNumber, undefined);
      assert.equal(pendingPayment.receiptIssuedAt, null);
      await Payment.deleteOne({ _id: pendingPayment._id });
    });

    await t.test("atomically enforces coupon usage limits for concurrent enrollments", async () => {
      const coupon = await Coupon.create({
        code: `ITRACE${randomUUID().replaceAll("-", "").slice(0, 10)}`,
        discountType: "FLAT",
        discountValue: 100,
        expiryDate: new Date(Date.now() + 86_400_000),
        usageLimit: 1,
        usageCount: 0,
        minimumPurchaseAmount: 1,
        isActive: true,
      });
      const requests = [member, otherMember].map((user) =>
        createDemoEnrollment({
          userId: user._id,
          planId: plan._id,
          paymentType: "FULL",
          amount: 0,
          paymentMethod: "UPI",
          couponCode: coupon.code,
          idempotencyKey: randomUUID(),
          quoteTotalPaise: 26_900,
        }),
      );
      const results = await Promise.allSettled(requests);
      assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
      assert.equal(results.filter((result) => result.status === "rejected").length, 1);
      assert.equal((await Coupon.findById(coupon._id).lean().exec()).usageCount, 1);
      assert.equal(await Subscription.countDocuments({ couponCodeSnapshot: coupon.code }), 1);
      assert.equal(await Payment.countDocuments({ couponCodeSnapshot: coupon.code }), 1);
    });

    await t.test("creates partial enrollment and processes subsequent balances once", async () => {
      const key = randomUUID();
      partialEnrollmentKey = key;
      const enrollment = {
        userId: member._id,
        planId: plan._id,
        paymentType: "PARTIAL",
        amount: 7_000,
        paymentMethod: "CARD",
        couponCode: "",
        idempotencyKey: key,
        quoteTotalPaise: 27_000,
      };
      const enrollmentReplays = await Promise.all([
        createDemoEnrollment(enrollment),
        createDemoEnrollment(enrollment),
      ]);
      partialSubscriptionId = enrollmentReplays[0];
      assert.equal(String(enrollmentReplays[1]), String(partialSubscriptionId));
      const replayReceipts = await Payment.find({
        idempotencyKey: key,
      }).select("receiptNumber").lean().exec();
      assert.equal(replayReceipts.length, 1);
      assert.ok(replayReceipts[0].receiptNumber);
      let subscription = await Subscription.findById(partialSubscriptionId).lean().exec();
      assert.equal(subscription.status, "PARTIAL");
      assert.equal(subscription.totalAmount, 27_000);
      assert.equal(subscription.amountPaid, 7_000);
      assert.equal(subscription.remainingBalance, 20_000);
      assert.equal(
        await Payment.countDocuments({ subscriptionId: partialSubscriptionId }),
        1,
      );

      await assert.rejects(
        createDemoBalancePayment({
          userId: otherMember._id,
          subscriptionId: partialSubscriptionId,
          amount: 1_000,
          paymentMethod: "UPI",
          idempotencyKey: randomUUID(),
        }),
        /No outstanding balance/,
      );
      await assert.rejects(
        createDemoBalancePayment({
          userId: member._id,
          subscriptionId: partialSubscriptionId,
          amount: 20_001,
          paymentMethod: "UPI",
          idempotencyKey: randomUUID(),
        }),
        /within the outstanding balance/,
      );

      const balanceKey = randomUUID();
      const balanceRequest = {
        userId: member._id,
        subscriptionId: partialSubscriptionId,
        amount: 8_000,
        paymentMethod: "UPI",
        idempotencyKey: balanceKey,
      };
      await Promise.all([
        createDemoBalancePayment(balanceRequest),
        createDemoBalancePayment(balanceRequest),
      ]);
      subscription = await Subscription.findById(partialSubscriptionId).lean().exec();
      assert.equal(subscription.amountPaid, 15_000);
      assert.equal(subscription.remainingBalance, 12_000);
      assert.equal(subscription.status, "PARTIAL");
      assert.equal(
        await Payment.countDocuments({ subscriptionId: partialSubscriptionId }),
        2,
      );

      await createDemoBalancePayment({
        userId: member._id,
        subscriptionId: partialSubscriptionId,
        amount: 12_000,
        paymentMethod: "UPI",
        idempotencyKey: randomUUID(),
      });
      subscription = await Subscription.findById(partialSubscriptionId).lean().exec();
      assert.equal(subscription.amountPaid, 27_000);
      assert.equal(subscription.remainingBalance, 0);
      assert.equal(subscription.status, "ACTIVE");
      assert.equal(
        await Payment.countDocuments({ subscriptionId: partialSubscriptionId }),
        3,
      );
    });

    await t.test("rejects reuse of an idempotency key with changed request values", async () => {
      await assert.rejects(
        createDemoEnrollment({
          userId: otherMember._id,
          planId: plan._id,
          paymentType: "PARTIAL",
          amount: 7_000,
          paymentMethod: "CARD",
          couponCode: "",
          idempotencyKey: partialEnrollmentKey,
          quoteTotalPaise: 27_000,
        }),
        /selected plan is unavailable|key has already been used/i,
      );
    });

    await t.test("rolls back stale quotes and refuses to enroll on an inactive plan", async () => {
      const beforeSubscriptions = await Subscription.countDocuments({});
      const beforePayments = await Payment.countDocuments({});
      await assert.rejects(
        createDemoEnrollment({
          userId: otherMember._id,
          planId: plan._id,
          paymentType: "FULL",
          amount: 0,
          paymentMethod: "UPI",
          couponCode: "",
          idempotencyKey: randomUUID(),
          quoteTotalPaise: 1,
        }),
        /checkout price changed/i,
      );
      await Plan.updateOne({ _id: plan._id }, { $set: { isActive: false } });
      await assert.rejects(
        createDemoEnrollment({
          userId: otherMember._id,
          planId: plan._id,
          paymentType: "FULL",
          amount: 0,
          paymentMethod: "UPI",
          couponCode: "",
          idempotencyKey: randomUUID(),
          quoteTotalPaise: 27_000,
        }),
        /plan is unavailable/i,
      );
      assert.equal(await Subscription.countDocuments({}), beforeSubscriptions);
      assert.equal(await Payment.countDocuments({}), beforePayments);
      await Plan.updateOne({ _id: plan._id }, { $set: { isActive: true } });
    });

    await t.test("keeps an expired membership expired after a final balance payment", async () => {
      const expiredPlan = await Plan.create({
        name: `Expired test plan ${randomUUID()}`,
        durationMonths: 1,
        baseMonthlyPrice: 10_000,
        allowPartialPayment: true,
        isActive: true,
      });
      const expiredId = await createDemoEnrollment({
        userId: otherMember._id,
        planId: expiredPlan._id,
        paymentType: "PARTIAL",
        amount: 1_000,
        paymentMethod: "UPI",
        couponCode: "",
        idempotencyKey: randomUUID(),
        quoteTotalPaise: 10_000,
      });
      await Subscription.updateOne(
        { _id: expiredId },
        { $set: { status: "EXPIRED", endDate: new Date(Date.now() - 86_400_000) } },
      );
      await createDemoBalancePayment({
        userId: otherMember._id,
        subscriptionId: expiredId,
        amount: 9_000,
        paymentMethod: "UPI",
        idempotencyKey: randomUUID(),
      });
      const expiredSubscription = await Subscription.findById(expiredId).lean().exec();
      assert.equal(expiredSubscription.status, "EXPIRED");
      assert.equal(expiredSubscription.remainingBalance, 0);
    });

    await t.test("enforces member ownership and role authorization policy", async () => {
      const ownBilling = await getBillingData(member._id);
      const otherBilling = await getBillingData(otherMember._id);
      assert.ok(ownBilling.payments.length > 0);
      assert.ok(ownBilling.payments.every((payment) => String(payment.userId) === String(member._id)));
      assert.ok(otherBilling.payments.every((payment) => String(payment.userId) === String(otherMember._id)));
      assert.equal(isAdministratorRole("ADMIN"), true);
      for (const role of ["USER", undefined, null, "admin"]) {
        assert.equal(isAdministratorRole(role), false);
      }
    });

    await t.test("returns subscription history and details only to the owning member", async () => {
      const subscriptions = await getMemberSubscriptions(member._id);
      assert.ok(subscriptions.length > 0);
      assert.ok(subscriptions.every((subscription) => String(subscription.userId) === String(member._id)));

      const details = await getMemberSubscriptionDetails(member._id, partialSubscriptionId);
      assert.ok(details);
      assert.equal(String(details.subscription._id), String(partialSubscriptionId));
      assert.ok(details.payments.length >= 2);
      assert.ok(details.payments.every((payment) => String(payment.userId) === String(member._id)));
      assert.equal(
        await getMemberSubscriptionDetails(otherMember._id, partialSubscriptionId),
        null,
      );
      assert.equal(await getMemberSubscriptionDetails(member._id, "invalid-id"), null);
    });

    await t.test("returns real admin statistics and scoped searchable lists", async () => {
      const overview = await getAdminOverview();
      assert.equal(overview.members, 2);
      assert.equal(overview.activeMembers, 2);
      assert.equal(overview.inactiveMembers, 0);
      assert.equal(overview.totalSubscriptions, 6);
      assert.equal(overview.activeSubscriptions, 5);
      assert.equal(overview.expiredSubscriptions, 1);
      assert.equal(overview.planCount, 2);
      assert.ok(overview.collected > 0);

      const members = await getAdminMembers(member.email);
      assert.equal(members.totalCount, 1);
      assert.equal(members.records[0].email, member.email);

      const subscriptions = await getAdminSubscriptions("", "all", 1);
      assert.equal(subscriptions.totalCount, 6);
      assert.equal(subscriptions.records.length, 6);
      assert.ok(subscriptions.records.every((record) => record.userId?.email));

      const transactions = await getAdminTransactions({ status: "SUCCEEDED", page: 1 });
      assert.ok(transactions.totalCount >= 10);
      assert.ok(transactions.records.every((record) => record.paymentStatus === "SUCCEEDED"));
      const filtered = await getAdminTransactions({
        search: transactions.records[0].transactionReference,
        status: "SUCCEEDED",
      });
      assert.equal(filtered.totalCount, 1);
    });

    await t.test("counts unique members with current active or paid partial subscriptions", async () => {
      const suffix = randomUUID();
      const users = await User.create([
        {
          clerkUserId: `it-dashboard-active-${suffix}`,
          name: "Dashboard Active Member",
          email: `dashboard-active-${suffix}@example.test`,
          role: "MEMBER",
        },
        {
          clerkUserId: `it-dashboard-none-${suffix}`,
          name: "Dashboard No Subscription",
          email: `dashboard-none-${suffix}@example.test`,
          role: "MEMBER",
        },
        {
          clerkUserId: `it-dashboard-expired-${suffix}`,
          name: "Dashboard Expired Member",
          email: `dashboard-expired-${suffix}@example.test`,
          role: "MEMBER",
        },
        {
          clerkUserId: `it-dashboard-multiple-${suffix}`,
          name: "Dashboard Multiple Subscriptions",
          email: `dashboard-multiple-${suffix}@example.test`,
          role: "MEMBER",
        },
        {
          clerkUserId: `it-dashboard-admin-${suffix}`,
          name: "Dashboard Administrator",
          email: `dashboard-admin-${suffix}@example.test`,
          role: "ADMIN",
        },
      ]);
      const now = new Date();
      const activeStart = new Date(now.getTime() - 86_400_000);
      const activeEnd = new Date(now.getTime() + 30 * 86_400_000);
      const expiredEnd = new Date(now.getTime() - 86_400_000);
      const subscriptionData = (userId, status, endDate = activeEnd) => ({
        userId,
        planId: plan._id,
        status,
        startDate: activeStart,
        endDate,
        totalAmount: 10_000,
        amountPaid: status === "PARTIAL" ? 5_000 : 10_000,
        remainingBalance: status === "PARTIAL" ? 5_000 : 0,
        planNameSnapshot: plan.name,
        baseMonthlyPriceSnapshot: plan.baseMonthlyPrice,
        discountPercentageSnapshot: plan.discountPercentage,
        durationMonthsSnapshot: plan.durationMonths,
        benefitsSnapshot: plan.benefits,
      });

      try {
        await Subscription.create([
          subscriptionData(users[0]._id, "ACTIVE"),
          subscriptionData(users[2]._id, "EXPIRED", expiredEnd),
          subscriptionData(users[3]._id, "ACTIVE"),
          subscriptionData(users[3]._id, "PARTIAL"),
          subscriptionData(users[4]._id, "ACTIVE"),
        ]);
        const overview = await getAdminOverview();
        assert.equal(overview.members, 6);
        assert.equal(overview.activeMembers, 4);
        assert.equal(overview.inactiveMembers, 2);
        assert.equal(overview.activeSubscriptions, 9);
        assert.equal(overview.expiredSubscriptions, 2);
      } finally {
        await Subscription.deleteMany({ userId: { $in: users.map(({ _id }) => _id) } });
        await User.deleteMany({ _id: { $in: users.map(({ _id }) => _id) } });
      }
    });

    await t.test("returns member details with only that member's subscription and payment history", async () => {
      const details = await getAdminMemberDetails(member._id.toString());
      assert.equal(String(details.member._id), String(member._id));
      assert.ok(details.subscriptions.length > 0);
      assert.ok(details.payments.length > 0);
      assert.ok(
        details.payments.every(
          (payment) => String(payment.userId) === String(member._id),
        ),
      );
      assert.equal(await getAdminMemberDetails("invalid-id"), null);

      await User.updateOne(
        { _id: member._id },
        {
          $set: {
            name: "Updated Integration Member",
            phone: "+1 415 555 0132",
            address: "123 Test Street",
          },
        },
      );
      const persisted = await User.findById(member._id).lean().exec();
      assert.equal(persisted.name, "Updated Integration Member");
      assert.equal(persisted.phone, "+1 415 555 0132");
      assert.equal(persisted.address, "123 Test Street");
    });

    await t.test("filters admin member listing by active membership state", async () => {
      const noMembershipMember = await User.create({
        clerkUserId: `it-member-${randomUUID()}`,
        name: "No Membership Member",
        email: `no-membership-${randomUUID()}@example.test`,
        role: "MEMBER",
      });
      const withoutActiveMembership = await getAdminMembers("", 1, "NONE");
      assert.equal(withoutActiveMembership.totalCount, 1);
      assert.equal(
        String(withoutActiveMembership.records[0]._id),
        String(noMembershipMember._id),
      );

      const activeMembers = await getAdminMembers("", 1, "ACTIVE");
      assert.ok(
        activeMembers.records.some((record) => String(record._id) === String(member._id)),
      );
      assert.ok(
        activeMembers.records.every((record) => String(record._id) !== String(noMembershipMember._id)),
      );
    });

    await t.test("admin member queries include MEMBER and legacy USER but exclude ADMIN", async () => {
      const suffix = randomUUID();
      const roleRecords = await User.create([
        {
          clerkUserId: `it-role-member-${suffix}`,
          name: "Role Query Member",
          email: `role-member-${suffix}@example.test`,
          role: "MEMBER",
        },
        {
          clerkUserId: `it-role-user-${suffix}`,
          name: "Role Query Legacy User",
          email: `role-user-${suffix}@example.test`,
          role: "USER",
        },
        {
          clerkUserId: `it-role-admin-${suffix}`,
          name: "Role Query Admin",
          email: `role-admin-${suffix}@example.test`,
          role: "ADMIN",
        },
      ]);

      try {
        const members = await getAdminMembers(suffix);
        assert.equal(members.totalCount, 2);
        assert.deepEqual(
          new Set(members.records.map((record) => record.email)),
          new Set([
            `role-member-${suffix}@example.test`,
            `role-user-${suffix}@example.test`,
          ]),
        );
        const adminDetails = await getAdminMemberDetails(roleRecords[2]._id.toString());
        assert.equal(adminDetails, null);
      } finally {
        await User.deleteMany({
          clerkUserId: { $in: roleRecords.map(({ clerkUserId }) => clerkUserId) },
        });
      }
    });

    await t.test("persists expiry for ended memberships but preserves future and cancelled records", async () => {
      const now = new Date("2026-11-06T00:00:00.000Z");
      const expiredDate = new Date(now.getTime() - 86_400_000);
      const futureDate = new Date(now.getTime() + 86_400_000);
      const base = {
        userId: member._id,
        planId: plan._id,
        startDate: expiredDate,
        totalAmount: 10_000,
        planNameSnapshot: plan.name,
        baseMonthlyPriceSnapshot: 10_000,
        discountPercentageSnapshot: 0,
        durationMonthsSnapshot: 1,
      };
      const [endedActive, endedPartial, futureActive, endedCancelled] =
        await Subscription.create([
          {
            ...base,
            status: "ACTIVE",
            endDate: expiredDate,
            amountPaid: 10_000,
            remainingBalance: 0,
          },
          {
            ...base,
            status: "PARTIAL",
            endDate: expiredDate,
            amountPaid: 1_000,
            remainingBalance: 9_000,
          },
          {
            ...base,
            status: "ACTIVE",
            endDate: futureDate,
            amountPaid: 10_000,
            remainingBalance: 0,
          },
          {
            ...base,
            status: "CANCELLED",
            endDate: expiredDate,
            amountPaid: 0,
            remainingBalance: 10_000,
          },
        ]);

      assert.equal(await expireSubscriptions(now), 2);
      const subscriptions = await Subscription.find({
        _id: {
          $in: [
            endedActive._id,
            endedPartial._id,
            futureActive._id,
            endedCancelled._id,
          ],
        },
      })
        .lean()
        .exec();
      const statusById = new Map(
        subscriptions.map((subscription) => [
          String(subscription._id),
          subscription.status,
        ]),
      );
      assert.equal(statusById.get(String(endedActive._id)), "EXPIRED");
      assert.equal(statusById.get(String(endedPartial._id)), "EXPIRED");
      assert.equal(statusById.get(String(futureActive._id)), "ACTIVE");
      assert.equal(statusById.get(String(endedCancelled._id)), "CANCELLED");
      assert.equal(await expireSubscriptions(now), 0);
    });

    await t.test("protects the scheduled expiry endpoint with its bearer secret", async () => {
      const previousSecret = process.env.CRON_SECRET;
      const secret = `test-cron-${randomUUID()}`;
      const token = `Bearer ${secret}`;
      const now = new Date();
      const expiredDate = new Date(now.getTime() - 86_400_000);
      const [subscription] = await Subscription.create([
        {
          userId: member._id,
          planId: plan._id,
          status: "ACTIVE",
          startDate: expiredDate,
          endDate: expiredDate,
          totalAmount: 10_000,
          amountPaid: 10_000,
          remainingBalance: 0,
          planNameSnapshot: plan.name,
          baseMonthlyPriceSnapshot: 10_000,
          discountPercentageSnapshot: 0,
          durationMonthsSnapshot: 1,
        },
      ]);

      try {
        delete process.env[["CRON", "SECRET"].join("_")];
        const unconfigured = await expireSubscriptionRoute(
          new Request("http://localhost/api/cron/expire-subscriptions"),
        );
        assert.equal(unconfigured.status, 503);

        process.env[["CRON", "SECRET"].join("_")] = secret;
        const unauthorized = await expireSubscriptionRoute(
          new Request("http://localhost/api/cron/expire-subscriptions"),
        );
        assert.equal(unauthorized.status, 401);

        const authorized = await expireSubscriptionRoute(
          new Request("http://localhost/api/cron/expire-subscriptions", {
            headers: { authorization: token },
          }),
        );
        assert.equal(authorized.status, 200);
        const response = await authorized.json();
        assert.ok(response.expiredCount >= 1, `Expected at least one expired subscription, got ${response.expiredCount}`);
        assert.equal(
          (await Subscription.findById(subscription._id).lean().exec()).status,
          "EXPIRED",
        );
      } finally {
        if (previousSecret === undefined) {
          delete process.env[["CRON", "SECRET"].join("_")];
        } else {
          process.env[["CRON", "SECRET"].join("_")] = previousSecret;
        }
      }
    });

    await t.test("protects admin accounts and requires exact member email confirmation", async () => {
      let clerkDeleteCalls = 0;
      const fakeAdmin = {
        _id: new mongoose.Types.ObjectId(),
        clerkUserId: "it-admin-for-deletion-policy",
        role: "ADMIN",
      };
      const soleAdmin = await User.create({
        clerkUserId: `it-admin-${randomUUID()}`,
        name: "Sole Admin",
        email: `sole-admin-${randomUUID()}@example.test`,
        role: "ADMIN",
      });
      await User.updateMany(
        { role: "ADMIN", _id: { $ne: soleAdmin._id } },
        { $set: { role: "MEMBER" } },
      );
      const lastAdminResult = await permanentlyDeleteMember({
        adminUser: fakeAdmin,
        memberId: soleAdmin._id.toString(),
        confirmationEmail: soleAdmin.email,
        deleteClerkUser: async () => { clerkDeleteCalls += 1; },
      });
      assert.equal(lastAdminResult.status, "last-admin-protected");

      const selfDeleteResult = await permanentlyDeleteMember({
        adminUser: {
          _id: member._id,
          clerkUserId: member.clerkUserId,
          role: "ADMIN",
        },
        memberId: member._id.toString(),
        confirmationEmail: member.email,
        deleteClerkUser: async () => { clerkDeleteCalls += 1; },
      });
      assert.equal(selfDeleteResult.status, "self-delete-prohibited");

      const mismatchResult = await permanentlyDeleteMember({
        adminUser: fakeAdmin,
        memberId: member._id.toString(),
        confirmationEmail: "wrong@example.test",
        deleteClerkUser: async () => { clerkDeleteCalls += 1; },
      });
      assert.equal(mismatchResult.status, "email-mismatch");
      assert.equal(clerkDeleteCalls, 0);
      const unauthorizedResult = await permanentlyDeleteMember({
        adminUser: member,
        memberId: member._id.toString(),
        confirmationEmail: member.email,
        deleteClerkUser: async () => { clerkDeleteCalls += 1; },
      });
      assert.equal(unauthorizedResult.status, "forbidden");
      assert.equal(clerkDeleteCalls, 0);
      assert.ok(await User.findById(member._id).exec());
    });

    await t.test("records activation and expiry notifications once and keeps member data private", async () => {
      const DAY_MS = 24 * 60 * 60 * 1000;
      const memberWithAlerts = await User.create({
        clerkUserId: `it-alert-member-${randomUUID()}`,
        name: "Alert Member",
        email: `alert-member-${randomUUID()}@example.test`,
        role: "MEMBER",
      });
      const otherMember = await User.create({
        clerkUserId: `it-alert-other-${randomUUID()}`,
        name: "Other Member",
        email: `other-alert-${randomUUID()}@example.test`,
        role: "MEMBER",
      });
      const alertPlan = await Plan.create({
        name: `Alert Plan ${randomUUID()}`,
        description: "Plan used for notification tests.",
        durationMonths: 3,
        baseMonthlyPrice: 12_000,
        discountPercentage: 0,
        benefits: ["Notification coverage"],
        allowPartialPayment: true,
        isActive: true,
      });

      const subscriptionId = await createDemoEnrollment({
        userId: memberWithAlerts._id,
        planId: alertPlan._id,
        paymentType: "FULL",
        amount: 0,
        paymentMethod: "UPI",
        couponCode: "",
        idempotencyKey: randomUUID(),
        quoteTotalPaise: 36_000,
      });
      const activationNotifications = await Notification.find({
        userId: memberWithAlerts._id,
        type: "ACTIVATION",
      })
        .sort({ createdAt: -1 })
        .lean()
        .exec();
      assert.equal(activationNotifications.length, 1);
      assert.match(activationNotifications[0].title, /is now active/i);
      assert.equal(activationNotifications[0].link, `/subscriptions/${String(subscriptionId)}`);
      assert.equal(
        await Notification.countDocuments({ userId: memberWithAlerts._id, type: "ACTIVATION" }).exec(),
        1,
      );

      const { ensureMembershipActivationNotification } = await import("../features/notifications/service.js");
      const pendingSubscription = await Subscription.create([
        {
          userId: memberWithAlerts._id,
          planId: alertPlan._id,
          status: "PENDING",
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * DAY_MS),
          totalAmount: 36_000,
          amountPaid: 0,
          remainingBalance: 36_000,
          planNameSnapshot: alertPlan.name,
          baseMonthlyPriceSnapshot: alertPlan.baseMonthlyPrice,
          discountPercentageSnapshot: alertPlan.discountPercentage,
          durationMonthsSnapshot: alertPlan.durationMonths,
          benefitsSnapshot: alertPlan.benefits,
        },
      ]).then(([record]) => record);
      const failedActivation = await ensureMembershipActivationNotification({
        userId: memberWithAlerts._id,
        subscriptionId: pendingSubscription._id,
        planName: pendingSubscription.planNameSnapshot,
        previousStatus: "PENDING",
        startDate: pendingSubscription.startDate,
        endDate: pendingSubscription.endDate,
      });
      assert.equal(failedActivation, null);
      assert.equal(
        await Notification.countDocuments({ userId: memberWithAlerts._id, type: "ACTIVATION" }).exec(),
        1,
      );

      const threeDayWindowStart = new Date(Date.now() + 3 * DAY_MS);
      const expirySubscription = await Subscription.create([
        {
          userId: memberWithAlerts._id,
          planId: alertPlan._id,
          status: "ACTIVE",
          startDate: new Date(Date.now() - 10 * DAY_MS),
          endDate: new Date(threeDayWindowStart.getTime() + 4 * DAY_MS),
          totalAmount: 12_000,
          amountPaid: 12_000,
          remainingBalance: 0,
          planNameSnapshot: alertPlan.name,
          baseMonthlyPriceSnapshot: alertPlan.baseMonthlyPrice,
          discountPercentageSnapshot: alertPlan.discountPercentage,
          durationMonthsSnapshot: alertPlan.durationMonths,
          benefitsSnapshot: alertPlan.benefits,
        },
      ]).then(([record]) => record);
      const warningNow = new Date(expirySubscription.endDate.getTime() - 3 * DAY_MS);
      await expireSubscriptions(warningNow);
      const expiryWarnings = await Notification.find({
        userId: memberWithAlerts._id,
        type: "EXPIRY_WARNING",
      })
        .sort({ createdAt: -1 })
        .lean()
        .exec();
      assert.equal(expiryWarnings.length, 1);
      assert.match(expiryWarnings[0].title, /expires in 3 days/i);
      assert.equal(expiryWarnings[0].link, "/billing");
      await expireSubscriptions(warningNow);
      assert.equal(
        await Notification.countDocuments({ userId: memberWithAlerts._id, type: "EXPIRY_WARNING" }).exec(),
        1,
      );

      assert.equal((await Notification.countDocuments({ userId: otherMember._id }).exec()), 0);
      const ownNotifications = await Notification.find({ userId: memberWithAlerts._id }).sort({ createdAt: -1 }).lean().exec();
      assert.ok(ownNotifications.every((notification) => String(notification.userId) === String(memberWithAlerts._id)));

      await Promise.all([
        Subscription.deleteMany({ _id: { $in: [pendingSubscription._id, expirySubscription._id] } }),
        Notification.deleteMany({ userId: memberWithAlerts._id }),
        Notification.deleteMany({ userId: otherMember._id }),
        Plan.deleteOne({ _id: alertPlan._id }),
        User.deleteOne({ _id: memberWithAlerts._id }),
        User.deleteOne({ _id: otherMember._id }),
      ]);
    });

    await t.test("deletes Clerk and profile, anonymizes but preserves financial history, and retries idempotently", async () => {
      const admin = await User.create({
        clerkUserId: `it-admin-${randomUUID()}`,
        name: "Deletion Admin",
        email: `deletion-admin-${randomUUID()}@example.test`,
        role: "ADMIN",
      });
      const personalAudit = await AdminAudit.create({
        adminUserId: admin._id,
        entityType: "USER",
        entityId: member._id,
        action: "MEMBER_UPDATED",
        reason: "Updated member contact details.",
        before: { name: member.name, phone: "555-0100", address: "Private address" },
        after: { name: member.name, phone: "555-0101", address: "Updated address" },
      });
      const subscriptionsBefore = await Subscription.find({ userId: member._id })
        .lean()
        .exec();
      const paymentsBefore = await Payment.find({ userId: member._id })
        .lean()
        .exec();
      assert.ok(subscriptionsBefore.length > 0);
      assert.ok(paymentsBefore.length > 0);

      let clerkDeleteCalls = 0;
      const cleanupFailure = await permanentlyDeleteMember({
        adminUser: admin,
        memberId: member._id.toString(),
        confirmationEmail: member.email,
        deleteClerkUser: async () => { clerkDeleteCalls += 1; },
        finalizeDeletion: async () => { throw new Error("isolated cleanup failure"); },
      });
      assert.equal(cleanupFailure.status, "cleanup-failed");
      assert.ok(await User.findById(member._id).exec());
      assert.equal(await Payment.countDocuments({ userId: member._id }), paymentsBefore.length);
      const cleanupAudit = await AdminAudit.findOne({
        entityId: member._id,
        action: "MEMBER_DELETION_FAILED",
      })
        .sort({ createdAt: -1 })
        .lean()
        .exec();
      assert.equal(cleanupAudit.after.clerkAccountDeleted, true);

      const clerkFailure = Object.assign(new Error("upstream failure"), { status: 500 });
      const failedAttempt = await permanentlyDeleteMember({
        adminUser: admin,
        memberId: member._id.toString(),
        confirmationEmail: member.email,
        deleteClerkUser: async () => {
          clerkDeleteCalls += 1;
          throw clerkFailure;
        },
      });
      assert.equal(failedAttempt.status, "clerk-deletion-failed");
      assert.ok(await User.findById(member._id).exec());
      assert.equal(await Payment.countDocuments({ userId: member._id }), paymentsBefore.length);

      const completed = await permanentlyDeleteMember({
        adminUser: admin,
        memberId: member._id.toString(),
        confirmationEmail: member.email,
        deleteClerkUser: async () => {
          clerkDeleteCalls += 1;
          const error = new Error("already removed");
          error.status = 404;
          throw error;
        },
      });
      assert.equal(completed.status, "deleted");
      assert.equal(clerkDeleteCalls, 3);
      assert.equal(await User.findById(member._id).exec(), null);
      assert.ok(await User.findById(otherMember._id).exec());
      assert.equal((await synchronizeClerkUserDeletion(member.clerkUserId)).status, "already-deleted");

      const retainedSubscriptions = await Subscription.find({
        _id: { $in: subscriptionsBefore.map(({ _id }) => _id) },
      })
        .lean()
        .exec();
      const retainedPayments = await Payment.find({
        _id: { $in: paymentsBefore.map(({ _id }) => _id) },
      })
        .lean()
        .exec();
      const memberReference = retainedSubscriptions[0].memberReference;
      assert.match(memberReference, /^ANON-/);
      assert.ok(retainedSubscriptions.every((record) =>
        record.userId === null &&
        record.memberReference === memberReference &&
        record.memberDeletedAt instanceof Date,
      ));
      assert.ok(retainedPayments.every((record) =>
        record.userId === null &&
        record.memberReference === memberReference &&
        record.memberDeletedAt instanceof Date &&
        record.memberSnapshot.name === "Deleted member" &&
        record.memberSnapshot.email === null &&
        record.memberSnapshot.memberId === memberReference,
      ));
      assert.deepEqual(
        retainedSubscriptions.map((record) => record.invoiceNumber),
        subscriptionsBefore.map((record) => record.invoiceNumber),
      );
      assert.deepEqual(
        retainedPayments.map((record) => record.receiptNumber),
        paymentsBefore.map((record) => record.receiptNumber),
      );
      assert.deepEqual(
        retainedPayments.map((record) => record.transactionReference),
        paymentsBefore.map((record) => record.transactionReference),
      );
      assert.ok(retainedSubscriptions.every((record) =>
        String(record.planId) === String(plan._id),
      ));
      const anonymizedTransactions = await getAdminTransactions({
        search: memberReference,
      });
      assert.equal(anonymizedTransactions.totalCount, paymentsBefore.length);
      assert.ok(anonymizedTransactions.records.every((record) =>
        record.userId === null &&
        record.memberReference === memberReference,
      ));
      const anonymizedSubscriptions = await getAdminSubscriptions(
        memberReference,
        "all",
        1,
      );
      assert.equal(anonymizedSubscriptions.totalCount, subscriptionsBefore.length);
      assert.ok(anonymizedSubscriptions.records.every((record) =>
        record.userId === null &&
        record.memberReference === memberReference,
      ));
      assert.equal(await getAdminMemberDetails(member._id.toString()), null);

      const scrubbedAudit = await AdminAudit.findById(personalAudit._id).lean().exec();
      assert.equal(scrubbedAudit.before, null);
      assert.equal(scrubbedAudit.after, null);
      assert.match(scrubbedAudit.reason, /personal data erased/i);
      const deletionAudit = await AdminAudit.findOne({
        entityType: "USER",
        entityId: member._id,
        action: "MEMBER_DELETED",
      })
        .lean()
        .exec();
      assert.equal(String(deletionAudit.adminUserId), String(admin._id));
      assert.equal(deletionAudit.after.mongoProfileDeleted, true);
      assert.equal(deletionAudit.after.clerkAccountDeleted, true);
      assert.equal(deletionAudit.after.subscriptionsAnonymized, subscriptionsBefore.length);
      assert.equal(deletionAudit.after.paymentsAnonymized, paymentsBefore.length);
      assert.ok(deletionAudit.clerkUserIdHash);
      assert.equal(deletionAudit.clerkUserIdHash.includes(member.clerkUserId), false);

      assert.equal(await syncClerkUser({
        id: member.clerkUserId,
        emailAddresses: [{ id: "email", emailAddress: member.email }],
        primaryEmailAddressId: "email",
      }), null);
      assert.equal(await User.findOne({ clerkUserId: member.clerkUserId }).exec(), null);
      const idempotentRetry = await permanentlyDeleteMember({
        adminUser: admin,
        memberId: member._id.toString(),
        confirmationEmail: member.email,
        deleteClerkUser: async () => { throw new Error("must not retry Clerk delete"); },
      });
      assert.equal(idempotentRetry.status, "deleted");
      assert.ok(await User.findById(otherMember._id).exec());
    });
  },
);
