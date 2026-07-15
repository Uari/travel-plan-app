// membersMap = { [userId]: { name, is_deleted } }

export function getDisplayName(membersMap, userId, { fallback = '알 수 없음', deletedSuffix = ' (탈퇴함)' } = {}) {
  const memberInfo = membersMap ? membersMap[userId] : null
  if (!memberInfo) return fallback
  return `${memberInfo.name}${memberInfo.is_deleted ? deletedSuffix : ''}`
}

export function canEditItem(isAdmin, item, currentUser) {
  return Boolean(isAdmin) || item.user_id === currentUser.id || item.created_by === currentUser.name
}
