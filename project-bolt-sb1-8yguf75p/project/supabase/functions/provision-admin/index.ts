import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    if (!url.pathname.endsWith("/provision-admin")) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json().catch(() => ({}));
    const action = body.action || "provision-admin";

    // ---------- provision-admin ----------
    if (action === "provision-admin") {
      const ADMIN_EMAIL = "madhanadmin19@gmail.com";
      const ADMIN_PASSWORD = "admin@123#madhan";
      const ADMIN_NAME = "System Administrator";

      const { data: existing } = await admin
        .from("admins")
        .select("id, email")
        .eq("email", ADMIN_EMAIL)
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({ message: "Admin already provisioned", email: ADMIN_EMAIL }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: ADMIN_NAME, role: "admin" },
        app_metadata: { role: "admin" },
      });

      let userId: string;
      if (createErr) {
        const { data: list, error: listErr } = await admin.auth.admin.listUsers();
        if (listErr) throw listErr;
        const u = list.users.find((x) => x.email === ADMIN_EMAIL);
        if (!u) throw new Error("Could not create or find admin user");
        userId = u.id;
      } else {
        userId = created.user.id;
      }

      const { error: insertErr } = await admin.from("admins").upsert(
        { id: userId, email: ADMIN_EMAIL, full_name: ADMIN_NAME, role: "admin" },
        { onConflict: "email" }
      );
      if (insertErr) throw insertErr;

      return new Response(
        JSON.stringify({ message: "Admin provisioned", email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---------- create-account ----------
    if (action === "create-account") {
      const { email, password, role, name, profile } = body;
      if (!email || !password || !role || !name) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create auth user
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name, role },
        app_metadata: { role },
      });
      if (createErr) throw createErr;
      const userId = created.user.id;

      // Link to profile table
      if (role === "faculty") {
        const { error: updErr } = await admin.from("faculty")
          .update({ user_id: userId, email, name, ...(profile || {}) })
          .eq("employee_id", profile?.employee_id || email);
        if (updErr) {
          // If no existing row match, insert a new one
          await admin.from("faculty").insert({
            user_id: userId, email, name,
            employee_id: profile?.employee_id || email,
            department_id: profile?.department_id || null,
            mobile_number: profile?.mobile_number || null,
            qualification: profile?.qualification || null,
          });
        }
      } else if (role === "student") {
        const { error: updErr } = await admin.from("students")
          .update({ user_id: userId, email, name, ...(profile || {}) })
          .eq("register_number", profile?.register_number || email);
        if (updErr) {
          await admin.from("students").insert({
            user_id: userId, email, name,
            register_number: profile?.register_number || email,
            department_id: profile?.department_id || null,
            course_id: profile?.course_id || null,
            semester: profile?.semester || 1,
            section: profile?.section || null,
            mobile_number: profile?.mobile_number || null,
            parent_name: profile?.parent_name || null,
            parent_mobile: profile?.parent_mobile || null,
            registered_device: profile?.registered_device || null,
            device_fingerprint: profile?.device_fingerprint || null,
            qr_code: profile?.register_number || email,
          });
        }
      }

      return new Response(JSON.stringify({ message: "Account created", userId, email, role }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ---------- delete-account ----------
    if (action === "delete-account") {
      const { userId } = body;
      if (!userId) return new Response(JSON.stringify({ error: "Missing userId" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw error;
      return new Response(JSON.stringify({ message: "Account deleted" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ---------- reset-password ----------
    if (action === "reset-password") {
      const { userId, password } = body;
      if (!userId || !password) return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { error } = await admin.auth.admin.updateUserById(userId, { password });
      if (error) throw error;
      return new Response(JSON.stringify({ message: "Password reset" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
