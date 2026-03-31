import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const VALID_TIPO_DOCUMENTO = [
  "Cédula de ciudadanía",
  "Tarjeta de identidad",
  "Cédula de extranjería",
  "Pasaporte",
  "Permiso por Protección Temporal (PPT)",
] as const;

const cofundadorSchema = z.object({
  nombres: z.string().trim().min(2).max(100),
  apellidos: z.string().trim().min(2).max(100),
  email: z.string().email().max(255),
  celular: z.string().max(20).optional().default(""),
  tipo_documento: z.enum(VALID_TIPO_DOCUMENTO).optional().or(z.literal("")),
  numero_identificacion: z.string().trim().min(1, "El número de identificación es obligatorio").max(50),
  genero: z.string().max(50).optional().default(""),
  departamento: z.string().max(100).optional().default(""),
  municipio: z.string().max(100).optional().default(""),
  direccion: z.string().max(255).optional().default(""),
  ano_nacimiento: z.string().max(10).optional().default(""),
  identificacion_etnica: z.string().max(100).optional().default(""),
  emprendimiento_id: z.string().uuid(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No autorizado" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: caller } } = await supabaseUser.auth.getUser();
    if (!caller) {
      return new Response(
        JSON.stringify({ error: "No autorizado" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const validatedData = cofundadorSchema.parse(body);

    // Check emprendimiento exists
    const { data: emprendimiento } = await supabaseAdmin
      .from('emprendimientos')
      .select('id, user_id')
      .eq('id', validatedData.emprendimiento_id)
      .single();

    if (!emprendimiento) {
      return new Response(
        JSON.stringify({ error: "Emprendimiento no encontrado" }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authorization: owner, admin, or any member of the emprendimiento
    const { data: isAdmin } = await supabaseAdmin.rpc('is_admin', { _user_id: caller.id });
    const { data: isMember } = await supabaseAdmin
      .from('emprendimiento_miembros')
      .select('id')
      .eq('emprendimiento_id', validatedData.emprendimiento_id)
      .eq('user_id', caller.id)
      .maybeSingle();

    if (emprendimiento.user_id !== caller.id && !isAdmin && !isMember) {
      return new Response(
        JSON.stringify({ error: "No tienes permiso para agregar cofundadores a este emprendimiento" }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Password = numero_identificacion
    const password = validatedData.numero_identificacion;

    // 1. Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: validatedData.email,
      password: password,
      email_confirm: true,
      user_metadata: {
        nombres: validatedData.nombres,
        apellidos: validatedData.apellidos,
      },
    });

    if (authError) {
      console.error("Auth error:", authError);
      if (authError.message?.includes('already been registered')) {
        return new Response(
          JSON.stringify({ error: "Ya existe un usuario registrado con este correo electrónico" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: "No se pudo crear el usuario" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newUserId = authData.user.id;

    // 2. Update the usuarios record
    const updateData: Record<string, any> = {};
    if (validatedData.celular) updateData.celular = validatedData.celular;
    if (validatedData.tipo_documento && validatedData.tipo_documento !== "") updateData.tipo_documento = validatedData.tipo_documento;
    if (validatedData.numero_identificacion) updateData.numero_identificacion = validatedData.numero_identificacion;
    if (validatedData.genero) updateData.genero = validatedData.genero;
    if (validatedData.departamento) updateData.departamento = validatedData.departamento;
    if (validatedData.municipio) updateData.municipio = validatedData.municipio;
    if (validatedData.direccion) updateData.direccion = validatedData.direccion;
    if (validatedData.ano_nacimiento) updateData.ano_nacimiento = validatedData.ano_nacimiento;
    if (validatedData.identificacion_etnica) updateData.identificacion_etnica = validatedData.identificacion_etnica;

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabaseAdmin.from("usuarios").update(updateData).eq("id", newUserId);
      if (updateError) {
        console.error("Update usuarios error:", updateError);
      }
    }

    // 3. Assign beneficiario role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newUserId, role: "beneficiario" });

    if (roleError) {
      console.error("Role error:", roleError);
    }

    // 4. Link to emprendimiento as member
    const { error: memberError } = await supabaseAdmin
      .from("emprendimiento_miembros")
      .insert({
        emprendimiento_id: validatedData.emprendimiento_id,
        user_id: newUserId,
        rol: 'cofundador',
      });

    if (memberError) {
      console.error("Member link error:", memberError);
      return new Response(
        JSON.stringify({ error: "Usuario creado pero no se pudo vincular al emprendimiento: " + memberError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[register-cofundador] Co-founder created: ${newUserId} for emprendimiento: ${validatedData.emprendimiento_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        user_id: newUserId,
        message: `Co-fundador ${validatedData.nombres} ${validatedData.apellidos} creado exitosamente. Su contraseña es su número de identificación.`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: "Datos inválidos", details: error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.error("[register-cofundador] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
