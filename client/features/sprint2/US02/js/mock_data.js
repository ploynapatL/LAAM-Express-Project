
/*
 * LAAM Express — Sprint 2 / US-02
 * Fictional rider assignments for frontend testing.
 *
 * These records are NOT from PostgreSQL.
 * Customer contact information belongs to US-03.
 */

export const MOCK_ASSIGNMENTS = [
  {
    taskId: "PK-1001",
    type: "pickup",
    date: "2026-11-10",
    startTime: "09:00",
    endTime: "10:00",
    address: "Sukhumvit Road, Khlong Toei, Bangkok",
    status: "Scheduled",
    note: "Please pick up at the reception (Building A)."
  },
  {
    taskId: "PK-1002",
    type: "pickup",
    date: "2026-11-10",
    startTime: "11:30",
    endTime: "12:30",
    address: "Silom Road, Bang Rak, Bangkok",
    status: "Scheduled",
    note: ""
  },
  {
    taskId: "PK-1003",
    type: "pickup",
    date: "2026-11-10",
    startTime: "14:00",
    endTime: "15:00",
    address: "Sathorn Road, Bangkok",
    status: "In Progress",
    note: "Please call when arriving."
  },
  {
    taskId: "DL-2001",
    type: "delivery",
    date: "2026-11-10",
    startTime: "10:00",
    endTime: "11:00",
    address: "Rama IV Road, Pathum Wan, Bangkok",
    status: "Scheduled",
    note: "Deliver to the security desk."
  },
  {
    taskId: "DL-2002",
    type: "delivery",
    date: "2026-11-10",
    startTime: "13:00",
    endTime: "14:00",
    address: "Phaya Thai Road, Bangkok",
    status: "Scheduled",
    note: ""
  },
  {
    taskId: "DL-2003",
    type: "delivery",
    date: "2026-11-10",
    startTime: "15:30",
    endTime: "16:30",
    address: "Chatuchak, Bangkok",
    status: "Completed",
    note: "Leave the parcel with reception."
  }
];

// Temporary asynchronous response simulation.
export async function getMockAssignments() {
  return structuredClone(MOCK_ASSIGNMENTS);
}
