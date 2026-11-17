
/*
 * LAAM EXPRESS — Sprint 2 / US-02
 * Mock Rider Schedule Data
 *
 * DEVELOPMENT TEST DATA ONLY
 * No PostgreSQL connection required.
 */

// Fictional riders for development testing.
const demoRiders = [
  {
    riderId: "RIDER-001",
    name: "Demo Pickup Rider",
    role: "pickup_rider",
    token: "demo-pickup-001"
  },
  {
    riderId: "RIDER-002",
    name: "Demo Delivery Rider",
    role: "delivery_rider",
    token: "demo-delivery-002"
  }
];

// Fictional pickup and delivery assignments.
const demoAssignments = [
  {
    taskId: "PK-1001",
    riderId: "RIDER-001",
    type: "pickup",
    date: "2026-11-10",
    startTime: "09:00",
    endTime: "10:00",
    address: "Sukhumvit Road, Khlong Toei, Bangkok",
    status: "Scheduled",
    note: "Please pick up at reception (Building A)."
  },
  {
    taskId: "PK-1002",
    riderId: "RIDER-001",
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
    riderId: "RIDER-001",
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
    riderId: "RIDER-002",
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
    riderId: "RIDER-002",
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
    riderId: "RIDER-002",
    type: "delivery",
    date: "2026-11-10",
    startTime: "15:30",
    endTime: "16:30",
    address: "Chatuchak, Bangkok",
    status: "Completed",
    note: "Leave the parcel with reception."
  }
];

module.exports = {
  demoRiders,
  demoAssignments
};
