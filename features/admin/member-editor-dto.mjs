export function toMemberEditorDto(member) {
  if (!member?._id || typeof member.name !== "string") {
    throw new Error("Member editor data is missing its ID or name.");
  }

  return {
    _id: member._id.toString(),
    name: member.name,
    phone: typeof member.phone === "string" ? member.phone : "",
    address: typeof member.address === "string" ? member.address : "",
  };
}
