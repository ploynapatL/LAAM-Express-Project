-- Sample data for a NEW EMPTY laam_express_dev database.
-- Run once after schema.sql. All IDs below are sample identity values from an empty DB.

BEGIN;
INSERT INTO customer (name,phone,email,address,customer_type) VALUES
 ('Levi','0811111111','levi@example.test','Bangkok','Member'),
 ('Mikasa','0822222222','mikasa@example.test','Nonthaburi','General'),
 ('Eren','0833333333','eren@example.test','Bangkok','Business');

INSERT INTO coupon (coupon_code,discount_type,discount_value,start_date,expiry_date,status) VALUES
 ('LAAM10','Fixed',10,'2026-01-01','2027-12-31','Active'),
 ('SAVE20','Percentage',20,'2026-01-01','2027-12-31','Active');

INSERT INTO branch (branch_name,address,phone) VALUES
 ('Bangkok Hub','Bangkok','021111111'),('Nonthaburi Branch','Nonthaburi','022222222');

INSERT INTO employee (name,phone,email,role,branch_id) VALUES
 ('Rider One','0891111111','rider1@example.test','Pickup Rider',1),
 ('Rider Two','0892222222','rider2@example.test','Delivery Rider',2),
 ('Hub Staff','0893333333','staff@example.test','Hub Staff',1);

INSERT INTO pickup (employee_id,appointment_date,appointment_time,pickup_location,pickup_result,inspection_status) VALUES
 (1,'2026-11-16','10:00','Bangkok, Customer A','Successful','Passed'),
 (1,'2026-11-17','14:00','Bangkok, Customer B','Scheduled','Pending');

INSERT INTO orders (customer_id,coupon_id,pickup_id,sender_name,sender_phone,sender_address,receiver_name,receiver_phone,receiver_address,service_type,shipping_fee,total_amount,order_status,membership_discount_amount) VALUES
 (1,1,1,'Alice','0811111111','Bangkok','Bob','0822222222','Nonthaburi','Standard',60,50,'In Transit',0),
 (1,NULL,1,'Alice','0811111111','Bangkok','Chai','0833333333','Bangkok','Express',100,100,'Picked Up',0),
 (2,NULL,2,'Bob','0822222222','Nonthaburi','Alice','0811111111','Bangkok','Standard',60,60,'Order Created',0);

INSERT INTO parcel (order_id,tracking_number,parcel_type,weight,length,width,height,destination_zone,current_status) VALUES
 (1,'LAAM001','Document',0.50,20,15,2,'Zone B','In Transit'),
 (2,'LAAM002','Box',2.00,30,25,20,'Zone A','Picked Up'),
 (3,'LAAM003','Box',1.00,20,20,15,'Zone A','Order Created');

INSERT INTO parcel_status_history (parcel_id,employee_id,status,timestamp,location) VALUES
 (1,NULL,'Order Created','2026-11-14 09:00+07','Bangkok'),
 (1,1,'Picked Up','2026-11-16 10:00+07','Bangkok'),
 (1,3,'In Transit','2026-11-16 12:00+07','Bangkok Hub'),
 (2,NULL,'Order Created','2026-11-14 09:30+07','Bangkok'),
 (2,1,'Picked Up','2026-11-16 10:10+07','Bangkok'),
 (3,NULL,'Order Created','2026-11-14 10:00+07','Nonthaburi');

INSERT INTO delivery (parcel_id,employee_id,delivery_date,delivery_status,proof_of_delivery) VALUES
 (1,2,NULL,'In Transit',NULL),(2,2,NULL,'Pending',NULL);

INSERT INTO payment (order_id,payment_method,payment_amount,payment_date,payment_status) VALUES
 (1,'QR',50,'2026-11-14 09:05+07','Paid'),
 (2,'Cash',100,'2026-11-16 10:10+07','Paid'),
 (3,'QR',60,NULL,'Pending');

INSERT INTO cod (order_id,cod_amount,cod_fee,collected_amount,settlement_status,settlement_amount) VALUES
 (2,500,10,0,'Pending',0);
COMMIT;

