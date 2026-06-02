const { getDatabase } = require('../db/connection');

function getGroups() {
  return getDatabase().prepare('SELECT * FROM family_groups ORDER BY name').all();
}

function getGroup(id) {
  const db = getDatabase();
  const group = db.prepare('SELECT * FROM family_groups WHERE id = ?').get(id);
  if (!group) return null;
  group.members = db.prepare(`SELECT m.id, m.first_name, m.last_name, m.email, m.phone, mp.name as plan_name
    FROM family_group_members fgm JOIN members m ON fgm.member_id = m.id
    LEFT JOIN member_plans mp ON mp.member_id = m.id AND mp.status = 'active'
    WHERE fgm.family_group_id = ?`).all(id);
  return group;
}

function createGroup({ name, discount_percentage }) {
  const db = getDatabase();
  const r = db.prepare('INSERT INTO family_groups (name, discount_percentage) VALUES (?, ?)').run(name || 'Family', discount_percentage || 10);
  return getGroup(r.lastInsertRowid);
}

function updateGroup(id, { name, discount_percentage }) {
  const db = getDatabase();
  if (name !== undefined) db.prepare('UPDATE family_groups SET name = ?, updated_at = datetime(\'now\') WHERE id = ?').run(name, id);
  if (discount_percentage !== undefined) db.prepare('UPDATE family_groups SET discount_percentage = ?, updated_at = datetime(\'now\') WHERE id = ?').run(discount_percentage, id);
  return getGroup(id);
}

function deleteGroup(id) {
  return getDatabase().prepare('DELETE FROM family_groups WHERE id = ?').run(id);
}

function addMember(groupId, memberId) {
  const db = getDatabase();
  db.prepare('INSERT OR IGNORE INTO family_group_members (family_group_id, member_id) VALUES (?, ?)').run(groupId, memberId);
  return getGroup(groupId);
}

function removeMember(groupId, memberId) {
  const db = getDatabase();
  db.prepare('DELETE FROM family_group_members WHERE family_group_id = ? AND member_id = ?').run(groupId, memberId);
  return getGroup(groupId);
}

function getFamilyDiscount(memberId) {
  const db = getDatabase();
  const row = db.prepare(`
    SELECT fg.discount_percentage, fg.name as group_name
    FROM family_group_members fgm
    JOIN family_groups fg ON fgm.family_group_id = fg.id
    WHERE fgm.member_id = ?
  `).get(memberId);
  return row ? { percentage: row.discount_percentage, groupName: row.group_name } : null;
}

function getMemberFamily(memberId) {
  const db = getDatabase();
  const group = db.prepare(`
    SELECT fg.* FROM family_group_members fgm
    JOIN family_groups fg ON fgm.family_group_id = fg.id
    WHERE fgm.member_id = ?
  `).get(memberId);
  if (!group) return null;
  return getGroup(group.id);
}

module.exports = { getGroups, getGroup, createGroup, updateGroup, deleteGroup, addMember, removeMember, getFamilyDiscount, getMemberFamily };
