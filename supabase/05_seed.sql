-- ============================================================
-- TERMAS DEL RÍO · Módulo de reservaciones
-- 05 · Datos iniciales (sin reservaciones ni pagos ficticios)
-- ============================================================

set search_path = public, extensions;

-- ---------- Tipos de cabaña ----------
insert into public.tipos_cabana
    (slug, nombre, descripcion, capacidad_max, camas, amenidades, activo, orden)
values
(
    'triple',
    'Cabaña Triple – 3 camas',
    $desc$Desconéctate del ruido de la ciudad y descubre una experiencia extraordinaria en nuestras acogedoras cabañas triples, ubicadas en medio de un hermoso entorno natural.

Rodeadas de árboles, vegetación y la tranquilidad del bosque, estas cabañas son el refugio perfecto para compartir momentos inolvidables con familiares o amigos.

Disfruta de espacios cómodos, dos amplias camas Queen y una cama unipersonal, en un ambiente donde la naturaleza se convierte en parte de tu descanso.

Despierta con la magia del bosque, respira aire puro y déjate envolver por la tranquilidad que solamente TERMAS DEL RÍO puede ofrecerte.$desc$,
    3,
    '2 camas Queen + 1 cama unipersonal',
    $amen$["2 camas Queen","1 cama unipersonal","Ambiente acogedor","Rodeada de bosque","Acceso a piscinas termales"]$amen$::jsonb,
    true,
    1
),
(
    'doble',
    'Cabaña Doble – 2 camas',
    $desc$Encuentra tu refugio perfecto en nuestras encantadoras cabañas dobles, escondidas entre la belleza natural del bosque de TERMAS DEL RÍO.

Un espacio pensado para descansar, disfrutar de la tranquilidad y vivir una experiencia diferente, lejos del estrés y del movimiento cotidiano.

Sus dos cómodas camas Queen y su ambiente acogedor crean el escenario ideal para disfrutar de una estancia inolvidable.

Déjate conquistar por el sonido de la naturaleza, el aire fresco y la maravillosa sensación de despertar rodeado de bosque.$desc$,
    2,
    '2 camas Queen',
    $amen$["2 camas Queen","Ambiente privado y acogedor","Rodeada de vegetación","Acceso a piscinas termales"]$amen$::jsonb,
    true,
    2
)
on conflict (slug) do nothing;

-- ---------- Inventario inicial: 10 dobles + 4 triples ----------
insert into public.cabanas (codigo, tipo_id, estado, activo)
select 'D-' || lpad(n::text, 2, '0'),
       (select id from public.tipos_cabana where slug = 'doble'),
       'disponible', true
from generate_series(1, 10) as n
on conflict (codigo) do nothing;

insert into public.cabanas (codigo, tipo_id, estado, activo)
select 'T-' || lpad(n::text, 2, '0'),
       (select id from public.tipos_cabana where slug = 'triple'),
       'disponible', true
from generate_series(1, 4) as n
on conflict (codigo) do nothing;

-- ---------- Ajustes del negocio ----------
insert into public.ajustes (clave, valor)
values
(
    'negocio',
    $json${
        "nombre": "Termas del Río",
        "moneda": "HNL",
        "simbolo": "L",
        "zona_horaria": "America/Tegucigalpa",
        "telefono": "+504 9351-5778",
        "whatsapp": "50493515778",
        "email": "reservaciones@termasdelrio.com",
        "direccion": "Km 7, carretera Gracias – Santa Rosa de Copán, aldea Río Grande, Gracias, Lempira, Honduras",
        "check_in": "",
        "check_out": "",
        "sitio": "https://termasdelrio.com"
    }$json$::jsonb
),
(
    'reservas',
    $json${
        "max_noches": 30,
        "mostrar_tarifas": true,
        "permitir_pendientes": true,
        "anticipo_sugerido_pct": 0
    }$json$::jsonb
),
(
    'pago_instrucciones',
    $json${
        "texto": ""
    }$json$::jsonb
),
(
    'plantillas',
    $json${
        "solicitud_recibida": "Estimado(a) {{huesped}}:\n\nRecibimos su solicitud {{codigo}} para {{tipo}} en {{negocio}}. Nuestro equipo revisará la disponibilidad y le contactará para confirmar.\n\nFechas solicitadas: {{entrada}} al {{salida}} ({{noches}} noches).\nPersonas: {{adultos}} adultos, {{ninos}} niños.\n\nGracias por escribirnos.\n{{negocio}}\nTel. {{telefono}} · {{email}}",
        "confirmada": "Estimado(a) {{huesped}}:\n\nSu reservación {{codigo}} ha sido confirmada.\n\nCabaña: {{cabana}} ({{tipo}})\nLlegada: {{entrada}}\nSalida: {{salida}}\nNoches: {{noches}}\nPersonas: {{adultos}} adultos, {{ninos}} niños\nTotal: {{total}}\nAnticipo recibido: {{anticipo}}\nSaldo pendiente: {{saldo}}\n\n{{instrucciones_pago}}\n\nLe esperamos.\n{{negocio}}\nTel. {{telefono}} · {{email}}",
        "pago_recibido": "Estimado(a) {{huesped}}:\n\nRegistramos su pago para la reservación {{codigo}}.\n\nMonto recibido: {{monto}}\nTotal: {{total}}\nSaldo pendiente: {{saldo}}\n\nGracias.\n{{negocio}}",
        "recordatorio": "Estimado(a) {{huesped}}:\n\nLe recordamos su llegada a {{negocio}} el {{entrada}}.\nReservación: {{codigo}}\nCabaña: {{cabana}} ({{tipo}})\nSalida: {{salida}}\nSaldo pendiente: {{saldo}}\n\nSi necesita modificar su llegada, contáctenos.\nTel. {{telefono}}",
        "modificada": "Estimado(a) {{huesped}}:\n\nSu reservación {{codigo}} fue modificada.\n\nNuevas fechas: {{entrada}} al {{salida}} ({{noches}} noches)\nCabaña: {{cabana}} ({{tipo}})\nTotal: {{total}}\nSaldo pendiente: {{saldo}}\n\nGracias.\n{{negocio}}",
        "cancelada": "Estimado(a) {{huesped}}:\n\nSu reservación {{codigo}} fue cancelada.\n\nSi se trata de un error o desea reprogramar, contáctenos.\nTel. {{telefono}} · {{email}}\n\n{{negocio}}",
        "rechazada": "Estimado(a) {{huesped}}:\n\nGracias por su solicitud {{codigo}}. Por el momento no tenemos disponibilidad para las fechas solicitadas ({{entrada}} al {{salida}}).\n\nPodemos ayudarle a buscar fechas alternativas.\nTel. {{telefono}} · {{email}}\n\n{{negocio}}"
    }$json$::jsonb
)
on conflict (clave) do nothing;
