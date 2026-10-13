export interface Solicitante {
  tenantId: string;
  conversaId: string;
  telefone: string;
  nome?: string;
  ehAdmin?: boolean; // ex: dono/gestor, com acesso a ações administrativas
}

export type TipoEvento = "mensagem" | "anexo_pdf" | "anexo_imagem" | "vcard" | "localizacao";

export interface EventoRecebido {
  tipo: TipoEvento;
  conteudo: string; // texto, ou referência ao arquivo já processado (não o payload bruto)
  recebidoEm: number;
}
