/**
 * GPU 작업 시간 측정.
 *
 * 정밀 측정에는 timestamp-query 가 필요하지만 브라우저/플래그에 따라 없을 수 있다.
 * 여기서는 어디서나 동작하는 fallback 으로, 작업을 제출한 뒤 onSubmittedWorkDone 으로
 * GPU 가 끝날 때까지 기다린 wall-clock 시간을 잰다. (대략적 측정)
 * 정밀 측정(22장 성능 최적화)에서 timestamp-query 로 확장한다.
 */
export async function measureGpuMs(
  device: GPUDevice,
  submit: () => void,
): Promise<number> {
  const start = performance.now();
  submit();
  await device.queue.onSubmittedWorkDone();
  return performance.now() - start;
}
