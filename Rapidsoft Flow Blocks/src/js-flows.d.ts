/** Tipos do módulo runtime em js/flows.js */
declare module '../js/flows.js' {
  export interface Grupo {
    id: string;
    nome: string;
    descricao?: string;
  }

  export interface Cliente {
    id: string;
    nome: string;
    temCustomizacao: boolean;
    tema?: string;
    grupos?: string[] | 'todos';
  }

  export interface BaseFlow {
    id: string;
    nome: string;
    descricao: string;
    sequenciaPosCredito: string[];
  }

  export interface ClienteTema {
    cor: string;
    fundo: string;
  }

  export const SEQUENCIA_PADRAO_POS_CREDITO: string[];
  export const SEQUENCIA_GRUPO_NOVA: string[];
  export const BASE_FLOW: BaseFlow;
  export const GRUPOS: Grupo[];
  export const GRUPO_FLUXOS: Record<string, unknown>;
  export const CLIENTES: Cliente[];
  export const CLIENT_TEMAS: Record<string, ClienteTema>;
  export const CLIENT_CUSTOMIZATIONS: Record<string, unknown>;
}
