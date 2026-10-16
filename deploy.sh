#!/bin/bash
# Bharat Quest — EC2 Production Deploy Script
# Run this on the EC2 instance after SSH-ing in
set -e

echo "🚀 Starting Bharat Quest deployment..."

# ── 1. Install Docker if not present ─────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  echo "Installing Docker..."
  sudo yum update -y
  sudo yum install -y docker git
  sudo systemctl enable docker
  sudo systemctl start docker
  sudo usermod -aG docker ec2-user
  sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
    -o /usr/local/bin/docker-compose
  sudo chmod +x /usr/local/bin/docker-compose
  echo "✅ Docker installed"
else
  echo "✅ Docker already installed"
fi

# Re-apply group membership without logout (needed for first run)
newgrp docker << 'NEWGRP'

# ── 2. Clone / update repo ────────────────────────────────────────────────────
if [ -d "/home/ec2-user/bharat-quest" ]; then
  echo "Updating existing repo..."
  cd /home/ec2-user/bharat-quest
  git pull origin main
else
  echo "Cloning repo..."
  cd /home/ec2-user
  git clone https://github.com/harshith-murali/bharat-quest.git
  cd bharat-quest
fi

# ── 3. Write .env ─────────────────────────────────────────────────────────────
cat > /home/ec2-user/bharat-quest/.env << 'ENV'
DATABASE_URL=__DATABASE_URL__
JWT_SECRET=msDYmr//Vf9faW07jxBmHj1ajY6vcrrMoKP4Lp8xhGP+9+fRk+DnX1o1SKhhKCLT
CORS_ORIGIN=http://__EC2_PUBLIC_IP__
COOKIE_SECURE=false
HF_API_KEY=
HF_MODEL=meta-llama/Llama-3.1-8B-Instruct
LOG_LEVEL=info
PG_POOL_MAX=10
ENV

echo "✅ .env written"

# ── 4. Build and start containers ─────────────────────────────────────────────
cd /home/ec2-user/bharat-quest
docker-compose -f docker-compose.prod.yml down --remove-orphans 2>/dev/null || true
docker-compose -f docker-compose.prod.yml up -d --build
echo "✅ Containers started"

# ── 5. Wait for backend to be ready ───────────────────────────────────────────
echo "Waiting for backend to be ready..."
sleep 15

# ── 6. Run migrations and seeds ───────────────────────────────────────────────
echo "Running migrations..."
docker-compose -f docker-compose.prod.yml exec -T backend npm run migrate

echo "Running seeds..."
docker-compose -f docker-compose.prod.yml exec -T backend npm run seed
docker-compose -f docker-compose.prod.yml exec -T backend npm run seed:classrooms
docker-compose -f docker-compose.prod.yml exec -T backend npm run seed:facts

echo "Creating admin account..."
docker-compose -f docker-compose.prod.yml exec -T backend \
  env ADMIN_EMAIL=head@school.test ADMIN_PASSWORD='BharatQuest#Admin2026!' npm run seed:admin

echo ""
echo "✅✅✅ DEPLOYMENT COMPLETE ✅✅✅"
echo "App is live at: http://__EC2_PUBLIC_IP__"
echo "Admin login:    head@school.test / BharatQuest#Admin2026!"

NEWGRP
