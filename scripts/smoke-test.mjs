const baseUrl = process.env.APP_URL || 'http://localhost:3000';

async function main() {
  const health = await fetch(`${baseUrl}/api/health`);
  console.log('health', health.status, await health.text());

  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@probiz.ai', password: 'Probiz01' })
  });

  console.log('login', login.status, await login.text());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
