// Test script untuk verify print queue fix
const printQueue = require("./services/printQueue");

console.log("🧪 Testing Print Queue...\n");

// Test 1: Add multiple jobs
console.log("Test 1: Adding 3 jobs to queue");
const printerName = "TEST_PRINTER";

const jobID1 = printQueue.addJob(
  printerName,
  async () => {
    console.log("  🖨️  Job 1 executing...");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("  ✅ Job 1 done!");
    return { result: "Job 1 Success" };
  },
  { test: "job1" },
);

console.log(`✅ Job 1 queued: ${jobID1}`);

const jobID2 = printQueue.addJob(
  printerName,
  async () => {
    console.log("  🖨️  Job 2 executing...");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("  ✅ Job 2 done!");
    return { result: "Job 2 Success" };
  },
  { test: "job2" },
);

console.log(`✅ Job 2 queued: ${jobID2}`);

const jobID3 = printQueue.addJob(
  printerName,
  async () => {
    console.log("  🖨️  Job 3 executing...");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("  ✅ Job 3 done!");
    return { result: "Job 3 Success" };
  },
  { test: "job3" },
);

console.log(`✅ Job 3 queued: ${jobID3}`);

// Test 2: Check job statuses
console.log("\nTest 2: Checking job statuses immediately");
setTimeout(() => {
  console.log("\n--- Job Statuses (after 500ms) ---");
  console.log("Job 1:", printQueue.getJobStatus(jobID1));
  console.log("Job 2:", printQueue.getJobStatus(jobID2));
  console.log("Job 3:", printQueue.getJobStatus(jobID3));
}, 500);

// Test 3: Check after completion
setTimeout(() => {
  console.log("\n--- Job Statuses (after 4 seconds) ---");
  console.log("Job 1:", printQueue.getJobStatus(jobID1));
  console.log("Job 2:", printQueue.getJobStatus(jobID2));
  console.log("Job 3:", printQueue.getJobStatus(jobID3));

  console.log("\n--- Queue Stats ---");
  console.log(printQueue.getStats());

  console.log("\n✅ Test completed!");
  process.exit(0);
}, 4000);
