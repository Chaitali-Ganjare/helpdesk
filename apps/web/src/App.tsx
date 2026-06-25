import { useEffect, useState } from "react";

export default function App() {
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setStatus(data.status));
  }, []);

  return (
    <div>
      <h1>Helpdesk</h1>
      <p>API status: {status ?? "loading..."}</p>
    </div>
  );
}
