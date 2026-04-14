# EC2 Production Deployment

These steps are for running the backend API in production on EC2 with PM2. The goal is to build the TypeScript app once, verify the database is ready, and run `dist/index.js` with `NODE_ENV=production`.

## 1. Connect to the Instance

Use EC2 Instance Connect or SSH, then switch to the application user you want PM2 to run under.

## 2. Install Node.js and Git

Install `nvm`, then install the current LTS release of Node.js:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
. ~/.nvm/nvm.sh
nvm install --lts
nvm use --lts
node -v
npm -v
```

Install Git:

```bash
sudo yum update -y
sudo yum install git -y
git --version
```

## 3. Clone the Repository

Clone into a path without spaces to make shell commands easier:

```bash
git clone <your-github-url> inventory-management-finance
cd inventory-management-finance/backend
```

## 4. Install Backend Dependencies

Install exactly what the lockfile declares:

```bash
npm ci
```

## 5. Create the Backend Environment File

Start from the template:

```bash
cp .env.example .env
```

Set production values before starting the API. At a minimum, configure:

- `PORT=3001`
- `JWT_SECRET=<long-random-secret>`
- `CORS_ORIGIN=<your-frontend-origin>`
- `PUBLIC_API_BASE_URL=<public-api-origin>`
- `AUTH_COOKIE_SECURE=true`
- `AUTH_COOKIE_SAME_SITE=lax`
- `MYSQL_HOST=<mysql-host>`
- `MYSQL_PORT=3306`
- `MYSQL_DATABASE=<database-name>`
- `MYSQL_USER=<database-user>`
- `MYSQL_PASSWORD=<database-password>`
- `MYSQL_AUTO_CREATE_DATABASE=false`

If the frontend and API are served from different sites, use `AUTH_COOKIE_SAME_SITE=none` and keep `AUTH_COOKIE_SECURE=true`.

## 6. Build, Bootstrap, and Verify

Run the production build:

```bash
npm run build
```

For a first deployment or after intentional schema changes, run:

```bash
npm run db:bootstrap
```

Before starting the API, verify that the database is reachable and fully prepared:

```bash
npm run db:verify
```

`db:bootstrap` is allowed to create schema, seed baseline data, and run one-off repair steps. `db:verify` is check-only and should be safe to run during deploys.

## 7. Install and Configure PM2

Install PM2 globally:

```bash
npm install -g pm2
```

The repo already includes a production-focused PM2 config in `backend/ecosystem.config.js`. It runs the compiled server from `dist/index.js` with `NODE_ENV=production`.

Start the API:

```bash
pm2 start ecosystem.config.js --env production
pm2 save
```

Enable PM2 on reboot:

```bash
sudo env PATH=$PATH:$(which node) $(which pm2) startup systemd -u $USER --hp $(eval echo ~$USER)
pm2 save
```

Useful PM2 commands:

```bash
pm2 status
pm2 logs inventory-management-api
pm2 restart inventory-management-api
pm2 reload ecosystem.config.js --env production
pm2 delete inventory-management-api
```

## 8. Deploying Updates

For normal code updates:

```bash
cd ~/inventory-management-finance/backend
git pull
npm ci
npm run build
npm run db:verify
pm2 reload ecosystem.config.js --env production
```

If the release includes intentional schema or seed changes:

```bash
npm run db:bootstrap
npm run db:verify
pm2 reload ecosystem.config.js --env production
```

## 9. Production Notes

- Do not run `npm run dev` on EC2 for production traffic.
- Do not set `NODE_ENV=development` in PM2.
- Do not bind the backend directly to port `80`; run it on an app port such as `3001` and place Nginx or another reverse proxy in front of it.
- Keep `backend/.env` out of version control.
- Treat `backend/dist/` as a build artifact, not committed source.
