const fs = require('fs/promises');
const { spawn } = require('child_process');
const { resolveRunPlan } = require('./models');

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function runCommand(command, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';

    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Command timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on('close', (code) => {
      clearTimeout(timeout);
      resolve({
        code,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        elapsedMs: Date.now() - startedAt
      });
    });
  });
}

async function runAsrModel({ modelId, audioPath, language = 'en', timeoutMs = 180000 }) {
  if (!(await fileExists(audioPath))) {
    throw new Error(`Audio file not found: ${audioPath}`);
  }

  const plan = resolveRunPlan(modelId, audioPath, language);

  if (!plan.command) {
    const elapsedMs = 150;
    return {
      modelId,
      transcript: plan.simulatedTranscript,
      elapsedMs,
      peakRssMb: Number((process.memoryUsage().rss / 1024 / 1024).toFixed(1)),
      command: 'simulated'
    };
  }

  const result = await runCommand(plan.command, plan.args, timeoutMs);
  if (result.code !== 0) {
    throw new Error(
      `Transcription failed for ${modelId} (exit ${result.code}).\n${result.stderr || 'No stderr output.'}`
    );
  }

  return {
    modelId,
    transcript: result.stdout || 'No transcript emitted by command. See commandHint in docs.',
    elapsedMs: result.elapsedMs,
    peakRssMb: Number((process.memoryUsage().rss / 1024 / 1024).toFixed(1)),
    command: `${plan.command} ${plan.args.join(' ')}`
  };
}

module.exports = {
  runAsrModel
};
