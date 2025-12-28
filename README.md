# Install dependencies

npm install

# Build TypeScript

npm run build

# Khởi động PostgreSQL và Elasticsearch

docker-compose up postgres elasticsearch -d

# Chờ services ready (khoảng 30-60 giây)

docker-compose logs -f postgres elasticsearch

# Check PostgreSQL

docker-compose exec postgres pg_isready -U postgres

# Check Elasticsearch

curl http://localhost:9200

# Expected: {"name":"xxx","cluster_name":"docker-cluster","cluster_uuid":"xxx","version":{"number":"8.15.2"...}}

# Generate Prisma client

npx prisma generate

# Chạy migrations

npx prisma migrate dev

# Seed full data (khuyên dùng cho testing)

npm run db:seed:streaming

# Hoặc seed từng phần (nếu muốn kiểm soát)

npm run db:seed:companies # Seed companies trước
npm run db:seed:jobs # Seed jobs
npm run db:seed # Seed users và data khác

# Mở Prisma Studio để xem data

npx prisma studio

# Truy cập: http://localhost:5555

# Setup Elasticsearch với Vietnamese support

npm run es:init

# Sync tất cả data từ database

npm run es:sync

# Check health

npm run es:health

# Check statistics

npm run es:stats

# Development mode với hot reload

npm run dev

# Hoặc production build

npm run build && npm start

# Health check

curl http://localhost:4000/api/health

# API Documentation

# Truy cập: http://localhost:4000/api-docs

# reset ES

$ npm run es:reset
