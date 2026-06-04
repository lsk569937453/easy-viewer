import toast from "react-hot-toast";

const SuccessIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ErrorIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const DaisyToast = ({ message, type }) => {
  // Truncate long messages
  const maxLength = 200;
  const displayMessage = message.length > maxLength
    ? message.substring(0, maxLength) + "..."
    : message;

  return (
    <div
      role="alert"
      className={`alert ${type === "success" ? "alert-success" : "alert-error"} shadow-lg max-w-xl w-full`}
      style={{ borderRadius: "var(--rounded-btn, 0.5rem)" }}
    >
      {type === "success" ? <SuccessIcon /> : <ErrorIcon />}
      <span className="text-sm whitespace-pre-wrap break-all">{displayMessage}</span>
    </div>
  );
};

export function showSuccess(message, options = {}) {
  return toast.custom(
    (t) => (
      <div
        className={`transition-all duration-300 ${t.visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}`}
      >
        <DaisyToast message={message} type="success" />
      </div>
    ),
    { duration: 3000, ...options }
  );
}

export function showError(message, options = {}) {
  return toast.custom(
    (t) => (
      <div
        className={`transition-all duration-300 ${t.visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}`}
      >
        <DaisyToast message={message} type="error" />
      </div>
    ),
    { duration: 4000, ...options }
  );
}
