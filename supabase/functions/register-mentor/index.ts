import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ACCESS_CODE = "YSA-MENTOR-ACCESS";

// Server-side validation schema (mirrors client-side for security)
const mentorSchema = z.object({
  accessCode: z.string().min(1).max(50),
  nombres: z.string().trim().min(2).max(100),
  apellidos: z.string().trim().min(2).max(100),
  email: z.string().email().max(255),
  celular: z.string().regex(/^3\d{9}$/),
  password: z.string().min(8).max(72), // bcrypt limit
});

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('[register-mentor] Incoming request');

  try {
    // Check content length to prevent oversized requests
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10000) { // 10KB limit
      console.warn('[register-mentor] Request too large');
      return new Response(
        JSON.stringify({ error: "Solicitud demasiado grande" }),
        { 
          status: 413, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const body = await req.json();
    
    // Validate input with Zod schema (SERVER-SIDE VALIDATION)
    const validatedData = mentorSchema.parse(body);
    const { accessCode, nombres, apellidos, email, celular, password } = validatedData;
    
    console.log('[register-mentor] Payload validated for:', email);

    // Validate access code
    if (accessCode !== ACCESS_CODE) {
      console.warn('[register-mentor] Invalid access code');
      return new Response(
        JSON.stringify({ error: "Código de acceso inválido" }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create Supabase admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // 1. Create user in auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nombres,
        apellidos,
      },
    });

    if (authError) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: authError.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: "No se pudo crear el usuario" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 2. Update user info in usuarios table
    const { error: usuarioError } = await supabaseAdmin
      .from("usuarios")
      .update({
        celular,
      })
      .eq("id", authData.user.id);

    if (usuarioError) {
      console.error("Usuario update error:", usuarioError);
      // Don't fail if this doesn't work, the trigger should have created the basic record
    }

    // 3. Assign mentor role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: authData.user.id,
        role: "mentor",
      });

    if (roleError) {
      console.error("Role assignment error:", roleError);
      return new Response(
        JSON.stringify({ error: "Error al asignar rol de mentor: " + roleError.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('[register-mentor] Mentor created:', authData.user.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Se ha creado el mentor ${nombres} ${apellidos}. Puede iniciar sesión con su email y contraseña.`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    // Handle validation errors from Zod
    if (error instanceof z.ZodError) {
      console.error('[register-mentor] Validation error:', error.errors);
      return new Response(
        JSON.stringify({ 
          error: "Datos de entrada inválidos", 
          details: error.errors 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.error("[register-mentor] Error general:", error);
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
