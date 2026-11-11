import type { TestResult } from "../../utils/connectionForm";

export interface ConnectionAlertsProps {
  error: string;
  testResult: TestResult;
  testMessage: string;
}

/** 表单错误与连接测试结果提示（顺序与原 JSX 一致：错误在前）。 */
function ConnectionAlerts({
  error,
  testResult,
  testMessage,
}: ConnectionAlertsProps) {
  return (
    <>
      {error && (
        <div role="alert" className="alert alert-error shadow-lg mt-4">
          <div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              className="stroke-current flex-shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}

      {testResult && (
        <div
          role="status"
          aria-live="polite"
          className={`alert ${
            testResult === "success" ? "alert-success" : "alert-error"
          } shadow-lg`}
        >
          <div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              className="stroke-current flex-shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d={
                  testResult === "success"
                    ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    : "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                }
              />
            </svg>
            <span>{testMessage}</span>
          </div>
        </div>
      )}
    </>
  );
}

export default ConnectionAlerts;
