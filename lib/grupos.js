// Validación de los datos de un grupo que llegan del panel.
import { campo, numero } from "./http.js";
import { desdeLinkDeMaps, dentroDeCaja } from "./geo.js";

export function datosGrupo(e) {
  if (!e || typeof e !== "object") return { error: "Datos no válidos." };
  const d = {
    distrito: campo(e.distrito, 10),
    grupo: campo(e.grupo, 120),
    ciudad: campo(e.ciudad, 80),
    estado: campo(e.estado, 60),
    direccion: campo(e.direccion, 250),
    colonia: campo(e.colonia, 120),
    cp: campo(e.cp, 10),
    referencia: campo(e.referencia, 250),
    terapia: campo(e.terapia, 60),
    personas: campo(e.personas, 60),
    idioma: campo(e.idioma, 40),
    horario: campo(e.horario, 600),
    telefono: campo(e.telefono, 120),
    maps_url: campo(e.maps_url, 500),
    lat: numero(e.lat),
    lng: numero(e.lng),
    precision_ubic: ["manual", "link"].includes(e.precision_ubic) ? e.precision_ubic : null,
  };
  if (!d.grupo) return { error: "Falta el nombre del grupo." };
  if (!d.distrito) return { error: "Falta el distrito." };
  if (!d.ciudad) return { error: "Falta la ciudad." };
  if (d.maps_url && !/^https:\/\//i.test(d.maps_url)) return { error: "El link de Google Maps debe empezar con https://" };
  if ((d.lat === null) !== (d.lng === null)) return { error: "La ubicación está incompleta." };
  if (d.lat !== null && !dentroDeCaja(d.lat, d.lng)) {
    return { error: "El pin quedó fuera de la zona del área (Mexicali, San Luis R.C., San Felipe). Revisa la ubicación." };
  }
  if (!d.estado) d.estado = d.ciudad === "San Luis Río Colorado" ? "Sonora" : "Baja California";
  return { datos: d };
}

// Si trae link de Google Maps pero no pin, intenta sacar el pin del link.
export async function completarUbicacion(d) {
  if (d.lat !== null || !d.maps_url) return d;
  try {
    const p = await desdeLinkDeMaps(d.maps_url);
    if (p) return { ...d, lat: p.lat, lng: p.lng, precision_ubic: "link" };
  } catch (_) { /* se guarda sin pin */ }
  return { ...d, aviso: "Se guardó, pero no se pudo leer el link de Google Maps. Pon el pin a mano en el mapa." };
}
