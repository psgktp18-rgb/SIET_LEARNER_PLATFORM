import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 150 }, // Ramp up to 150 users in 30s
    { duration: '1m', target: 150 },  // Stay at 150 users for 1m
    { duration: '10s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'], // http errors should be less than 1%
    http_req_duration: ['p(95)<1500'], // 95% of requests should be below 1.5s
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:3000';

export default function () {
  // Determine LT username
  // 150 students spread across AIDS, AIML, CSE, IT
  const depts = ['AIDS', 'AIML', 'CSE', 'IT'];
  const userNum = (__VU % 150) + 1;
  const dept = depts[userNum % 4];
  const regNo = `LT3${dept}${String(userNum).padStart(3, '0')}`;

  const payload = JSON.stringify({
    regNo: regNo,
    password: 'password123',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // 1. Login
  const res = http.post(`${BASE_URL}/api/auth/login`, payload, params);
  check(res, {
    'logged in successfully': (r) => r.status === 200,
  });

  if (res.status === 200) {
    // 2. Load dashboard
    const dashRes = http.get(`${BASE_URL}/student`, params);
    check(dashRes, {
      'dashboard loaded': (r) => r.status === 200,
    });
  }

  sleep(1);
}
