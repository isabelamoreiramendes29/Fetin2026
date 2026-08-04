// Configuracoes do Supabase do Cemtinel
// Usado para login e cadastro de usuarios (substitui os topicos app/log e app/cad)
// O MQTT continua responsavel por temperatura ao vivo e financeiro

const supabaseConfig = {
  // URL do projeto — Project Settings > API > Project URL
  url: 'https://elmcidhbtmzsyojzfdui.supabase.co',

  // Chave publica do projeto — Project Settings > API > anon public
  // Esta chave pode ficar no codigo do app: ela e publica por design.
  // Quem protege os dados sao as policies de RLS no banco, nao o sigilo dela.
  // NUNCA colocar aqui a chave service_role.
  chaveAnon: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsbWNpZGhidG16c3lvanpmZHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NDM5OTIsImV4cCI6MjEwMTQxOTk5Mn0.wxy7DrRgzWmNR77vzTFy_7IfsqTSauP0EMGq5A3IVI8',

  // Tipos de usuario — mesmos valores usados no cadastro e no backend do MQTT
  TIPO_MESTRE: 0,
  TIPO_CONSTRUTORA: 1,
};

export default supabaseConfig;
