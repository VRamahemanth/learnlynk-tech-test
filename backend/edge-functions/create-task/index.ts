// LearnLynk Tech Test - Task 3: Edge Function create-task

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const VALID_TYPES = ["call", "email", "review"];

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { application_id, task_type, due_at } = body ?? {};

    // --------------------
    // VALIDATION
    -----------------------

    if (!application_id || !task_type || !due_at) {
      return new Response(
        JSON.stringify({ error: "Missing fields: application_id, task_type, due_at required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate task type
    if (!VALID_TYPES.includes(task_type)) {
      return new Response(
        JSON.stringify({ error: "Invalid task_type. Must be call/email/review" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate due_at timestamp
    const dueDate = new Date(due_at);
    if (isNaN(dueDate.getTime())) {
      return new Response(
        JSON.stringify({ error: "Invalid due_at value" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (dueDate <= new Date()) {
      return new Response(
        JSON.stringify({ error: "due_at must be a future datetime" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // --------------------------------------
    // OPTIONAL: Verify application exists
    // --------------------------------------
    const { data: appCheck, error: appError } = await supabase
      .from("applications")
      .select("id")
      .eq("id", application_id)
      .single();

    if (appError || !appCheck) {
      return new Response(
        JSON.stringify({ error: "Application not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // --------------------------------------
    // INSERT TASK
    // --------------------------------------
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        application_id,
        type: task_type,
        due_at,
      })
      .select()
      .single();

    if (error) {
      console.error("Insert error:", error);
      return new Response(
        JSON.stringify({ error: "Database insert failed", details: error.message }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // --------------------------------------
    // REALTIME BROADCAST
    // --------------------------------------
    await supabase.realtime.channel("task.created").send({
      type: "broadcast",
      event: "task.created",
      payload: data,
    });

    // --------------------------------------
    // SUCCESS RESPONSE
    // --------------------------------------
    return new Response(
      JSON.stringify({ success: true, task_id: data.id }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Function error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
