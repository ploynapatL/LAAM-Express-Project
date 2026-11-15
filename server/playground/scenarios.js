"use strict";
// Predeclared, parameterized, fixed SQL only. No browser-provided SQL runs here.
// Each scenario receives a database client inside a transaction that is ALWAYS rolled back.
const cases = [];
const add = (id, fr, name, kind, run, coverage = "direct") =>
  cases.push({ id, fr, name, kind, coverage, run });
const q = (c, sql, args = []) => c.query(sql, args);
const rows = async (c, sql, args = []) => (await q(c, sql, args)).rows;
const first = async (c, sql, args = []) =>
  (await rows(c, sql, args))[0] || null;
const ensure = (condition, message) => {
  if (!condition) throw new Error(message);
};
async function reject(c, sql, args = [], { code, match } = {}) {
  await q(c, "SAVEPOINT expected_rejection");
  try {
    await q(c, sql, args);
    await q(c, "ROLLBACK TO SAVEPOINT expected_rejection");
    throw new Error("Unexpectedly accepted invalid operation");
  } catch (e) {
    if (e.message === "Unexpectedly accepted invalid operation") throw e;
    await q(c, "ROLLBACK TO SAVEPOINT expected_rejection");
    if (code && e.code !== code)
      throw new Error(
        `Expected SQLSTATE ${code}; got ${e.code || "unknown"}: ${e.message}`,
      );
    if (match && !e.message.includes(match))
      throw new Error(`Unexpected database rejection: ${e.message}`);
    return {
      sqlstate: e.code || null,
      constraint: e.constraint || null,
      message: e.message.slice(0, 240),
      rejected: true,
    };
  }
}

const sample = async (c) =>
  first(
    c,
    `SELECT
        p.parcel_id,
        p.order_id,
        p.tracking_number,
        p.current_status,
        o.service_type
     FROM parcel p
     JOIN orders o ON o.order_id = p.order_id
     ORDER BY p.parcel_id
     LIMIT 1`,
  );

const find = async (c, sql) => first(c, sql);
const fallback = (v, message) => {
  ensure(v, message);
  return v;
};
// Existing tests: TC-01 to TC-12, supplementary TC-02A
add("TC-01", null, "Required database tables exist", "structure", async (c) => {
  const list = [
    "customer",
    "coupon",
    "branch",
    "employee",
    "orders",
    "parcel",
    "parcel_status_history",
    "pickup",
    "delivery",
    "payment",
    "cod",
  ];

  const r = await rows(
  c,
  `SELECT tablename AS table_name
   FROM pg_catalog.pg_tables
   WHERE schemaname = 'public'
     AND tablename = ANY($1)
   ORDER BY tablename`,
  [list]
);

  ensure(r.length === 11, `Expected 11 tables; found ${r.length}`);
  return { observed: r, expected: "11 required public tables" };
});
add(
  "TC-02",
  "FR-01",
  "Original duplicate tracking + order (ambiguous)",
  "integrity",
  async (c) => {
    const p = await sample(c);
    fallback(p, "No sample parcel");
    const e = await reject(
      c,
      "INSERT INTO parcel(order_id,tracking_number,parcel_type) VALUES($1,$2,$3)",
      [p.order_id, p.tracking_number, "Box"],
      { code: "23505" },
    );
    return {
      observed: e,
      expected: "Rejected: original case may fail order_id UNIQUE first",
      note: "Limited evidence. Use TC-02A for tracking uniqueness.",
    };
  },
  "limited",
);
add(
  "TC-02A",
  "FR-01",
  "Tracking number UNIQUE independently",
  "integrity",
  async (c) => {
    const p = await sample(c);
    const other = await first(
      c,
      "SELECT parcel_id FROM parcel WHERE parcel_id<>$1 LIMIT 1",
      [p.parcel_id],
    );
    fallback(other, "Need two parcels");
    const e = await reject(
      c,
      "UPDATE parcel SET tracking_number=$1 WHERE parcel_id=$2",
      [p.tracking_number, other.parcel_id],
      { code: "23505" },
    );
    ensure(
      e.constraint?.includes("tracking_number"),
      "Rejected by another UNIQUE constraint",
    );
    return { observed: e, expected: "tracking_number UNIQUE violation" };
  },
);
add("TC-03", null, "Reject negative shipping fee", "integrity", async (c) => {
  const o = fallback(
    await first(c, "SELECT order_id FROM orders LIMIT 1"),
    "No order",
  );
  return {
    observed: await reject(
      c,
      "UPDATE orders SET shipping_fee=-10 WHERE order_id=$1",
      [o.order_id],
      { code: "23514" },
    ),
    expected: "CHECK violation",
  };
});
add("TC-04", "FR-06", "Reject Chilled on Standard", "trigger", async (c) => {
  const p = fallback(
    await first(
      c,
      `SELECT p.parcel_id FROM parcel p JOIN orders o ON o.order_id=p.order_id WHERE o.service_type='Standard' LIMIT 1`,
    ),
    "No Standard parcel",
  );
  return {
    observed: await reject(
      c,
      "UPDATE parcel SET parcel_type='Chilled' WHERE parcel_id=$1",
      [p.parcel_id],
      { match: "require Express" },
    ),
    expected: "Service trigger rejects invalid combination",
  };
});
add(
  "TC-05",
  "FR-02",
  "Require inspection before successful pickup",
  "constraint",
  async (c) => {
    const p = fallback(
      await first(c, "SELECT pickup_id FROM pickup LIMIT 1"),
      "No pickup",
    );
    return {
      observed: await reject(
        c,
        "UPDATE pickup SET inspection_status='Pending',pickup_result='Successful' WHERE pickup_id=$1",
        [p.pickup_id],
        { code: "23514" },
      ),
      expected: "Pickup inspection CHECK rejection",
    };
  },
  "supporting",
);
add("TC-06", "FR-05", "Delivered requires proof", "constraint", async (c) => {
  const d = fallback(
    await first(c, "SELECT delivery_id FROM delivery LIMIT 1"),
    "No delivery",
  );
  return {
    observed: await reject(
      c,
      "UPDATE delivery SET delivery_status='Delivered', delivery_date=now(),proof_of_delivery=NULL WHERE delivery_id=$1",
      [d.delivery_id],
      { code: "23514" },
    ),
    expected: "Proof CHECK rejection",
  };
});
add(
  "TC-07",
  "FR-04",
  "Reject invalid status transition",
  "trigger",
  async (c) => {
    const p = fallback(
      await first(
        c,
        "SELECT parcel_id FROM parcel WHERE current_status='Order Created' LIMIT 1",
      ),
      "Need Order Created parcel",
    );
    return {
      observed: await reject(
        c,
        "UPDATE parcel SET current_status='Delivered' WHERE parcel_id=$1",
        [p.parcel_id],
        { match: "Invalid status transition" },
      ),
      expected: "Invalid transition rejected",
    };
  },
);
add(
  "TC-08",
  "FR-04",
  "Update parcel status and history atomically",
  "function",
  async (c) => {
    const p = fallback(
      await first(
        c,
        "SELECT parcel_id,tracking_number FROM parcel WHERE current_status='Order Created' LIMIT 1",
      ),
      "Need Order Created parcel",
    );
    const e = fallback(
      await first(c, "SELECT employee_id FROM employee LIMIT 1"),
      "Need employee",
    );
    const before = await first(
      c,
      "SELECT count(*)::int AS n FROM parcel_status_history WHERE parcel_id=$1",
      [p.parcel_id],
    );
    await q(c, "SELECT update_parcel_status($1,$2,$3,$4)", [
      p.tracking_number,
      "Picked Up",
      "Nonthaburi Branch",
      e.employee_id,
    ]);
    const after = await first(
      c,
      "SELECT current_status,(SELECT count(*)::int FROM parcel_status_history WHERE parcel_id=$1) AS history_count FROM parcel WHERE parcel_id=$1",
      [p.parcel_id],
    );
    ensure(
      after.current_status === "Picked Up" &&
        after.history_count === before.n + 1,
      "Status/history mismatch",
    );
    return {
      observed: { beforeHistory: before.n, ...after },
      expected: "Picked Up and exactly one new history row; rolled back",
    };
  },
);
add(
  "TC-09",
  "FR-07",
  "Require COD settlement date",
  "constraint",
  async (c) => {
    const cod = fallback(
      await first(c, "SELECT cod_id FROM cod LIMIT 1"),
      "No COD record",
    );
    return {
      observed: await reject(
        c,
        "UPDATE cod SET settlement_status='Settled',collected_date=now(),settlement_date=NULL,settlement_amount=1 WHERE cod_id=$1",
        [cod.cod_id],
        { code: "23514" },
      ),
      expected: "Settlement CHECK rejection",
    };
  },
);
add(
  "TC-10",
  "FR-03",
  "Basic database role privileges",
  "permission",
  async (c) => {
    const r = await first(
      c,
      `SELECT has_table_privilege('laam_tracking_reader','parcel','SELECT') AS tracking_select,has_table_privilege('laam_tracking_reader','parcel','UPDATE') AS tracking_update,has_table_privilege('laam_pickup_rider','orders','SELECT') AS rider_orders_select`,
    );
    ensure(
      r && r.tracking_select && !r.tracking_update && !r.rider_orders_select,
      "Unexpected DB privileges",
    );
    return {
      observed: r,
      expected: "Tracking SELECT true/UPDATE false; rider orders SELECT false",
      note: "Checks PostgreSQL privileges only, not backend authentication or scoped contact requests",
    };
  },
  "supporting",
);
add(
  "TC-11",
  null,
  "Reject nonexistent customer FK",
  "integrity",
  async (c) => ({
    observed: await reject(
      c,
      "INSERT INTO orders(customer_id,service_type) VALUES(-99999,'Standard')",
      [],
      { code: "23503" },
    ),
    expected: "Foreign key rejection",
  }),
);
add(
  "TC-12",
  "FR-06",
  "Prevent downgrading Express for Chilled",
  "trigger",
  async (c) => {
    const p = fallback(
      await first(
        c,
        "SELECT p.parcel_id,p.order_id FROM parcel p JOIN orders o ON o.order_id=p.order_id WHERE o.service_type='Express' LIMIT 1",
      ),
      "Need Express parcel",
    );
    await q(c, "UPDATE parcel SET parcel_type='Chilled' WHERE parcel_id=$1", [
      p.parcel_id,
    ]);
    return {
      observed: await reject(
        c,
        "UPDATE orders SET service_type='Standard' WHERE order_id=$1",
        [p.order_id],
        { match: "require Express" },
      ),
      expected: "Order service trigger rejection",
    };
  },
);
// New tests TC-13..TC-32
add(
  "TC-13",
  "FR-01",
  "Lookup parcel by tracking number",
  "query",
  async (c) => {
    const p = fallback(await sample(c), "No parcel");
    const r = await first(
      c,
      "SELECT p.tracking_number,p.current_status,o.service_type FROM parcel p JOIN orders o ON o.order_id=p.order_id WHERE p.tracking_number=$1",
      [p.tracking_number],
    );
    ensure(r?.tracking_number === p.tracking_number, "Parcel not returned");
    return { observed: r, expected: `Matches ${p.tracking_number}` };
  },
);

add("TC-14", "FR-01", "Chronological parcel history", "query", async (c) => {
  const p = fallback(await sample(c), "No parcel");

  const history = await rows(
    c,
    `SELECT
        h.status,
        h.timestamp,
        h.location,
        h.employee_id
     FROM parcel_status_history h
     WHERE h.parcel_id = $1
     ORDER BY h.timestamp, h.status_history_id`,
    [p.parcel_id],
  );

  ensure(history.length > 0, "No tracking history sample");

  ensure(
    history.every(
      (v, i) =>
        i === 0 ||
        new Date(history[i - 1].timestamp) <= new Date(v.timestamp)
    ),
    "History out of order"
  );

  return {
    observed: history,
    expected:
      "Chronological history with status, timestamp, location, and employee ID"
  };
});

add(
  "TC-15",
  "FR-02",
  "View assigned pickup appointments",
  "query",
  async (c) => {
    const e = fallback(
      await first(
        c,
        "SELECT employee_id FROM pickup WHERE employee_id IS NOT NULL LIMIT 1",
      ),
      "No assigned pickup",
    );
    const data = await rows(
      c,
      "SELECT pickup_id,employee_id,appointment_date,appointment_time,pickup_result FROM pickup WHERE employee_id=$1 ORDER BY appointment_date,appointment_time",
      [e.employee_id],
    );
    ensure(
      data.length > 0 &&
        data.every(
          (x) =>
            x.employee_id === e.employee_id &&
            x.appointment_date &&
            x.appointment_time,
        ),
      "Invalid schedule",
    );
    return {
      observed: data,
      expected: `Only employee ${e.employee_id} appointments`,
    };
  },
);
add(
  "TC-16",
  "FR-02",
  "Rider with no assignments receives empty schedule",
  "boundary",
  async (c) => {
    const data = await rows(
      c,
      "SELECT pickup_id FROM pickup WHERE employee_id=$1",
      [2147483647],
    );
    ensure(data.length === 0, "Expected empty result");
    return { observed: data, expected: "Empty array; no error" };
  },
);
add("TC-17", "FR-03", "Assigned rider contact lookup", "query", async (c) => {
  const a = fallback(
    await first(
      c,
      `SELECT p.employee_id,p.pickup_id,o.order_id FROM pickup p JOIN orders o ON o.pickup_id=p.pickup_id WHERE p.employee_id IS NOT NULL LIMIT 1`,
    ),
    "No assigned pickup/order",
  );
  const result = await first(
    c,
    `SELECT o.sender_phone AS phone,p.employee_id FROM pickup p JOIN orders o ON o.pickup_id=p.pickup_id WHERE p.employee_id=$1 AND p.pickup_id=$2 AND o.order_id=$3`,
    [a.employee_id, a.pickup_id, a.order_id],
  );
  ensure(result?.phone, "Assigned phone missing");
  return {
    observed: {
      assigned: true,
      phone: "[REDACTED]",
      employee_id: result.employee_id,
    },
    expected: "Phone retrieved only for assigned task",
    note: "Scoped SQL test. Does not by itself verify HTTP authentication.",
  };
});
add(
  "TC-18",
  "FR-03",
  "Unassigned rider cannot retrieve task contact",
  "security",
  async (c) => {
    const a = fallback(
      await first(
        c,
        `SELECT p.employee_id,p.pickup_id,o.order_id FROM pickup p JOIN orders o ON o.pickup_id=p.pickup_id WHERE p.employee_id IS NOT NULL LIMIT 1`,
      ),
      "No assigned pickup/order",
    );
    const r = await rows(
      c,
      `SELECT o.sender_phone FROM pickup p JOIN orders o ON o.pickup_id=p.pickup_id WHERE p.employee_id=$1 AND p.pickup_id=$2 AND o.order_id=$3`,
      [2147483647, a.pickup_id, a.order_id],
    );
    ensure(r.length === 0, "Unassigned information disclosed");
    return {
      observed: { rows: r.length },
      expected: "Zero rows from assignment-scoped SQL",
      note: "SQL isolation demonstrated; full API authorization requires separate authenticated request",
    };
  },
);
add(
  "TC-19",
  "FR-04",
  "Role cannot directly update parcel status",
  "permission",
  async (c) => {
    const r = await first(
      c,
      `SELECT has_table_privilege('laam_tracking_reader','parcel','UPDATE') AS can_update`,
    );
    ensure(r && !r.can_update, "Reader unexpectedly can UPDATE");
    return {
      observed: r,
      expected: "Tracking reader cannot UPDATE parcel",
      note: "Database privilege test; no impersonated app role",
    };
  },
  "supporting",
);
add(
  "TC-20",
  "FR-05",
  "Valid successful delivery with proof",
  "write",
  async (c) => {
    const d = fallback(
      await first(c, "SELECT delivery_id FROM delivery LIMIT 1"),
      "No delivery",
    );
    const r = await first(
      c,
      "UPDATE delivery SET delivery_status='Delivered',delivery_date=now(),proof_of_delivery='DEMO-TEST-SIGNATURE' WHERE delivery_id=$1 RETURNING delivery_id,delivery_status,delivery_date,proof_of_delivery",
      [d.delivery_id],
    );
    ensure(
      r?.delivery_status === "Delivered" && r.proof_of_delivery,
      "Delivery not saved",
    );
    return {
      observed: r,
      expected: "Delivered with proof/date; transaction rolled back",
    };
  },
);
add(
  "TC-21",
  "FR-06",
  "Accept Chilled + Express combination",
  "write",
  async (c) => {
    const p = fallback(
      await first(
        c,
        "SELECT p.parcel_id FROM parcel p JOIN orders o ON o.order_id=p.order_id WHERE o.service_type='Express' LIMIT 1",
      ),
      "No Express parcel",
    );
    const r = await first(
      c,
      "UPDATE parcel SET parcel_type='Chilled' WHERE parcel_id=$1 RETURNING parcel_id,parcel_type",
      [p.parcel_id],
    );
    ensure(r?.parcel_type === "Chilled", "Express + Chilled rejected");
    return { observed: r, expected: "Accepted by trigger; rolled back" };
  },
);
add(
  "TC-22",
  "FR-07",
  "Retrieve COD collection and settlement",
  "query",
  async (c) => {
    const data = await rows(
      c,
      "SELECT c.cod_id,c.order_id,c.cod_amount,c.collected_amount,c.settlement_amount,c.settlement_status,p.tracking_number FROM cod c JOIN orders o ON o.order_id=c.order_id LEFT JOIN parcel p ON p.order_id=o.order_id ORDER BY c.cod_id LIMIT 5",
    );
    ensure(data.length > 0, "No COD records");
    return { observed: data, expected: "COD summary rows with linked orders" };
  },
);
add(
  "TC-23",
  "FR-07",
  "Valid COD collection and settlement",
  "write",
  async (c) => {
    const cod = fallback(
      await first(
        c,
        "SELECT cod_id,cod_amount FROM cod WHERE cod_amount>0 LIMIT 1",
      ),
      "No suitable COD",
    );
    const r = await first(
      c,
      "UPDATE cod SET collected_amount=cod_amount,collected_date=now(),settlement_amount=cod_amount,settlement_date=now(),settlement_status='Settled' WHERE cod_id=$1 RETURNING cod_id,collected_amount,settlement_amount,settlement_status,settlement_date",
      [cod.cod_id],
    );
    ensure(r?.settlement_status === "Settled", "Settlement not saved");
    return { observed: r, expected: "Valid settlement stored; rolled back" };
  },
);
add(
  "TC-24",
  "FR-07",
  "Failed delivery cancels uncollected pending COD",
  "trigger",
  async (c) => {
    const cod = fallback(
      await first(
        c,
        "SELECT c.cod_id,p.parcel_id,d.delivery_id FROM cod c JOIN parcel p ON p.order_id=c.order_id JOIN delivery d ON d.parcel_id=p.parcel_id WHERE c.settlement_status='Pending' AND c.collected_amount=0 LIMIT 1",
      ),
      "No pending COD with delivery",
    );
    await q(
      c,
      "UPDATE delivery SET delivery_status='Failed' WHERE delivery_id=$1",
      [cod.delivery_id],
    );
    const updated = await first(
      c,
      "SELECT settlement_status FROM cod WHERE cod_id=$1",
      [cod.cod_id],
    );
    ensure(
      updated?.settlement_status === "Cancelled",
      "COD trigger did not cancel",
    );
    return {
      observed: updated,
      expected: "Cancelled after failed delivery event; rolled back",
      note: "Demonstrates implemented trigger, not necessarily final-attempt business policy",
    };
  },
);
add(
  "TC-25",
  "FR-07",
  "Two-business-day COD settlement policy",
  "policy",
  async (c) => {
    const r = await first(
      c,
      `SELECT COUNT(*)::int AS rows_with_dates FROM cod WHERE settlement_date IS NOT NULL AND collected_date IS NOT NULL`,
    );
    return {
      observed: r,
      expected: "Policy requires business-day calendar and deadline checks",
      verdict: "NOT_IMPLEMENTED",
      note: "Schema documents the two-business-day rule as NOT enforced. Cannot claim PASS.",
    };
  },
);
add(
  "TC-26",
  "FR-08",
  "Apply one valid coupon to an order",
  "write",
  async (c) => {
    const o = fallback(
      await first(c, "SELECT order_id FROM orders LIMIT 1"),
      "No order",
    );
    const coupon = fallback(
      await first(
        c,
        "SELECT coupon_id,coupon_code FROM coupon WHERE status='Active' AND start_date<=current_date AND expiry_date>=current_date LIMIT 1",
      ),
      "No currently eligible coupon",
    );
    const r = await first(
      c,
      "UPDATE orders SET coupon_id=$1 WHERE order_id=$2 RETURNING order_id,coupon_id",
      [coupon.coupon_id, o.order_id],
    );
    ensure(r?.coupon_id === coupon.coupon_id, "Coupon not assigned");
    return {
      observed: { ...r, code: coupon.coupon_code },
      expected: "One coupon FK attached; rolled back",
      note: "No discount recalculation enforced by current schema",
    };
  },
);
add(
  "TC-27",
  "FR-08",
  "Order has at most one coupon FK",
  "structure",
  async (c) => {
    const r = await rows(
      c,
      `SELECT column_name,data_type FROM information_schema.columns WHERE table_name='orders' AND column_name='coupon_id'`,
    );
    ensure(r.length === 1, "Coupon FK column missing");
    const f = await first(
      c,
      `SELECT COUNT(*)::int AS n FROM pg_constraint WHERE conrelid='orders'::regclass AND contype='f' AND pg_get_constraintdef(oid) ILIKE '%coupon_id%'`,
    );
    ensure(f?.n >= 1, "Coupon FK missing");
    return {
      observed: { column: r[0], foreignKeys: f.n },
      expected:
        "Single scalar coupon_id FK prevents simultaneous multiple coupon references",
      note: "Replacing an existing coupon remains possible; no stacking operation exists",
    };
  },
  "supporting",
);
add(
  "TC-28",
  "FR-08",
  "Coupon with membership discount",
  "write",
  async (c) => {
    const o = fallback(
      await first(c, "SELECT order_id FROM orders LIMIT 1"),
      "No order",
    );
    const cp = fallback(
      await first(c, "SELECT coupon_id FROM coupon LIMIT 1"),
      "No coupon",
    );
    const r = await first(
      c,
      "UPDATE orders SET coupon_id=$1,membership_discount_amount=5 WHERE order_id=$2 RETURNING order_id,coupon_id,membership_discount_amount",
      [cp.coupon_id, o.order_id],
    );
    ensure(
      r?.coupon_id === cp.coupon_id &&
        Number(r.membership_discount_amount) === 5,
      "Combined representation failed",
    );
    return {
      observed: r,
      expected: "Both fields stored; rolled back",
      note: "Actual discount computation is NOT implemented in schema",
    };
  },
  "supporting",
);
add("TC-29", "FR-09", "Employees by branch JOIN", "query", async (c) => {
  const b = fallback(
    await first(
      c,
      "SELECT branch_id,branch_name FROM branch ORDER BY branch_id LIMIT 1",
    ),
    "No branch",
  );
  const r = await rows(
    c,
    "SELECT e.employee_id,e.name,e.role,b.branch_name FROM employee e JOIN branch b ON b.branch_id=e.branch_id WHERE b.branch_id=$1 ORDER BY e.employee_id",
    [b.branch_id],
  );
  ensure(r.length > 0, "No employees for sample branch");
  return { observed: r, expected: `Employees working at ${b.branch_name}` };
});
add(
  "TC-30",
  "FR-09",
  "Role restrictions for employee directory",
  "permission",
  async (c) => {
    const r = await first(
      c,
      `SELECT has_column_privilege('laam_pickup_rider','employee','name','SELECT') AS rider_name,has_column_privilege('laam_pickup_rider','employee','email','SELECT') AS rider_email`,
    );
    ensure(
      r?.rider_name && !r.rider_email,
      "Employee directory column permissions unexpected",
    );
    return {
      observed: r,
      expected: "Rider may read name but not email",
      note: "DB column privileges, not an application-level 403 test",
    };
  },
  "supporting",
);
add("TC-31", "FR-10", "Record a valid order payment", "write", async (c) => {
  const o = fallback(
    await first(c, "SELECT order_id FROM orders LIMIT 1"),
    "No order",
  );
  const r = await first(
    c,
    "INSERT INTO payment(order_id,payment_method,payment_amount,payment_date,payment_status) VALUES($1,'Cash',25,now(),'Paid') RETURNING payment_id,order_id,payment_method,payment_amount,payment_status",
    [o.order_id],
  );
  ensure(r?.order_id === o.order_id, "Payment insert failed");
  return {
    observed: r,
    expected: "Payment FK linked to existing order; rolled back",
  };
});
add("TC-32", "FR-10", "Reject negative payment", "constraint", async (c) => {
  const o = fallback(
    await first(c, "SELECT order_id FROM orders LIMIT 1"),
    "No order",
  );
  return {
    observed: await reject(
      c,
      "INSERT INTO payment(order_id,payment_method,payment_amount,payment_status) VALUES($1,'Cash',-10,'Paid')",
      [o.order_id],
      { code: "23514" },
    ),
    expected: "Negative amount CHECK violation",
  };
});
module.exports = { cases };
