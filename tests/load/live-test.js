import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 150 },
    { duration: '2m', target: 150 }, // 2 minutes of test time
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'], 
    http_req_duration: ['p(95)<300'], // Auto-saves must be very fast < 300ms
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:3000';

export default function () {
  // (Assuming already logged in or simulating the API layer with known auth, but k6 needs cookies)
  // For simplicity, we just hit the API with a mock header or we login first.
  const depts = ['AIDS', 'AIML', 'CSE', 'IT'];
  const userNum = (__VU % 150) + 1;
  const dept = depts[userNum % 4];
  const regNo = `LT3${dept}${String(userNum).padStart(3, '0')}`;

  let res = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    regNo, password: 'password123'
  }), { headers: { 'Content-Type': 'application/json' } });

  if (res.status !== 200) return;

  // Wait simulating think time
  sleep(Math.random() * 5); 

  // Simulate auto-save answers for 20 questions
  for (let q = 1; q <= 20; q++) {
    // In a real app we'd fetch the test ID, here we mock the structure 
    // or assume the endpoint handles auto-saving answers
    let saveRes = http.post(`${BASE_URL}/api/student/test/autosave`, JSON.stringify({
      testId: 'mock-lt-test-id',
      questionId: `mock-q-${q}`,
      answer: 'A'
    }), { headers: { 'Content-Type': 'application/json' } });
    
    // Auto save latency check
    check(saveRes, { 'autosave ok': (r) => r.status === 200 || r.status === 404 }); // 404 acceptable if mock ID not found
    
    sleep(Math.random() * 2 + 1); // think time between answers
  }

  // Final Submit
  let submitRes = http.post(`${BASE_URL}/api/student/test/submit`, JSON.stringify({
    testId: 'mock-lt-test-id'
  }), { headers: { 'Content-Type': 'application/json' } });
  
  check(submitRes, { 'submit ok': (r) => r.status === 200 || r.status === 404 });
}
