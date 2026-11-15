'use strict';
const names = [
['Track a parcel using its tracking number','BR-02, BR-07, BR-08','Customer','Enter a tracking number → API validates → PostgreSQL reads parcel and chronological history → UI displays response'],
['View scheduled pickup appointments','BR-05','Pickup Rider','Identify rider → request schedule → query assigned pickups → display appointment date and time'],
['Access contact details for assigned deliveries or pickups','BR-17','Pickup/Delivery Rider','Identify rider → select assigned task → backend verifies association → return permitted phone only'],
['Update parcel delivery status','BR-07, BR-08','Authorized Employee','Choose parcel and status → backend validates → PostgreSQL function updates status and writes history'],
['Confirm successful delivery','BR-09','Delivery Rider','Select delivery → attach proof reference → database validates delivered status → read saved record'],
['Validate special parcel services','BR-04','Counter Staff','Select parcel type and service → database trigger enforces Express for Chilled/Frozen'],
['Manage COD transactions','BR-11, BR-12, BR-13','Finance Staff','Read COD order → record collection/settlement → verify constraints and cancellation policy'],
['Apply coupon discounts','BR-14, BR-15','Customer/Counter Staff','Select order and coupon → verify eligible coupon → associate coupon and inspect discounts'],
['View employees working at each branch','BR-17','Manager/Admin','Choose branch → authorized API retrieves matching employees'],
['Record parcel payments','BR-03 (indirect)','Counter/Finance Staff','Select order → submit payment amount/method → database validates and stores payment']
];
const requirements=names.map((r,i)=>({id:`FR-${String(i+1).padStart(2,'0')}`,name:r[0],br:r[1],actor:r[2],useCase:r[3],documentation:'GitHub Wiki: Functional Requirements / Business Rules'}));
module.exports={requirements};
