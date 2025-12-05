import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

type Task = {
  id: string;
  type: string;
  status: string;
  application_id: string;
  due_at: string;
};

export default function TodayDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // -------------------------
  // FETCH TASKS
  // -------------------------
  async function fetchTasks() {
    setLoading(true);
    setError(null);

    try {
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .gte("due_at", `${today}T00:00:00Z`)
        .lte("due_at", `${today}T23:59:59Z`)
        .neq("status", "completed") // avoid completed tasks
        .order("due_at", { ascending: true });

      if (error) throw error;

      setTasks(data || []);
    } catch (err: any) {
      console.error(err);
      setError("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }

  // -------------------------
  // MARK COMPLETE
  // -------------------------
  async function markComplete(id: string) {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: "completed" })
        .eq("id", id);

      if (error) throw error;

      // refresh tasks list
      fetchTasks();
    } catch (err: any) {
      console.error(err);
      alert("Failed to update task");
    }
  }

  useEffect(() => {
    fetchTasks();
  }, []);

  // -------------------------
  // UI STATES
  // -------------------------
  if (loading) return <div>Loading tasks...</div>;
  if (error) return <div style={{ color: "red" }}>{error}</div>;

  return (
    <main style={{ padding: "1.5rem" }}>
      <h1>Today's Tasks</h1>

      {tasks.length === 0 && <p>No tasks due today 🎉</p>}

      {tasks.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Application</th>
              <th>Due At</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {tasks.map((t) => (
              <tr key={t.id}>
                <td>{t.type}</td>
                <td>{t.application_id}</td>
                <td>{new Date(t.due_at).toLocaleString()}</td>
                <td>{t.status}</td>
                <td>
                  {t.status !== "completed" && (
                    <button onClick={() => markComplete(t.id)}>
                      Mark Complete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
