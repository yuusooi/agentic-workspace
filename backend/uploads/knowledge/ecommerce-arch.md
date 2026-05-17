# E-commerce Platform Technical Architecture

This project uses micro-frontend architecture, main framework qiankun, sub-apps based on React 18 + TypeScript.

## Core Modules
1. User Center
2. Product Center
3. Order Center
4. Marketing Center
5. Logistics Center

## Deployment Architecture
- Frontend: Nginx + CDN
- Backend: K8s containerized deployment
- Database: Master-slave replication
- Cache: Redis Cluster