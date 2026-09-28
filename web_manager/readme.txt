B1: npm i
B2: set up sql in "Sql" Folder
B3: run command >> node server/server.js

MongoDB reporting API
=====================
1. Cai dependency: yarn add mongodb (hoac npm install)
2. Cau hinh MONGODB_URI va MONGODB_DB trong .env.
3. Khai bao whitelist collection/field tai server/defines/mongoDataSources.js.

POST /api/mongodb/data (Bearer admin token)
{
  "info": "sensor",
  "data_check": "temp",
  "max": 1000,
  "time_start": "2026-01-01T00:00:00.000Z",
  "time_end": "2026-01-31T23:59:59.999Z",
  "type_time": "time_save",
  "type": 3,
  "export": 1
}

type: 1=raw, 2/3=sum/avg day, 4/5=sum/avg month, 6/7=sum/avg year.
export: 1=JSON, 2=CSV download ngay, 3=worker CSV nen (tra job_id).
Voi export=3, GET /api/mongodb/exports/:jobId de lay status va download_url
khi status=completed. File CSV duoc luu tai public/uploads/datas va API chi cho
dung nguoi tao job tai file.


//sửa bảng Enterprise , DetailBank ,Customer 
