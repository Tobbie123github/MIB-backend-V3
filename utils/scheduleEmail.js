const Agenda = require("agenda");
require("dotenv").config();

const agenda = new Agenda({
  db: { address: process.env.MONGO_URI, collection: "emailJobsQueue" }
});

module.exports = async function scheduleEmailJob(jobId, delayInMinutes = 0.5) {
  await agenda.start();
  const scheduledTime = new Date(Date.now() + delayInMinutes * 60 * 1000);
  await agenda.schedule(scheduledTime, "send-email-job", { jobId });
  return { scheduledFor: scheduledTime };
};
