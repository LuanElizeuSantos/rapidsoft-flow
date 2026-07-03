import * as Blockly from 'blockly/core';

const TECLAS_FUNCAO = Array.from({ length: 12 }, (_, i) => {
  const f = `F${i + 1}`;
  return [f, f] as [string, string];
});

const TECLAS_ATALHO = [
  ['Enter', 'Enter'],
  ['Tab', 'Tab'],
  ['Esc', 'Escape'],
  ...TECLAS_FUNCAO,
] as [string, string][];

/** Teclas para pausar até o usuário agir */
const TECLAS_ESPERA_USUARIO = [
  ['Esc', 'Escape'],
  ['Enter', 'Enter'],
  ['Espaço', ' '],
  ['Tab', 'Tab'],
  ...TECLAS_FUNCAO,
] as [string, string][];

const SETAS = [
  ['↑ cima', 'ArrowUp'],
  ['↓ baixo', 'ArrowDown'],
  ['← esquerda', 'ArrowLeft'],
  ['→ direita', 'ArrowRight'],
] as [string, string][];

const MODIFICADORES = [
  ['Alt', 'Alt'],
  ['Ctrl', 'Control'],
  ['Shift', 'Shift'],
  ['Ctrl + Alt', 'Control+Alt'],
  ['Ctrl + Shift', 'Control+Shift'],
  ['Alt + Shift', 'Alt+Shift'],
] as [string, string][];

const BOTOES_SISTEMA = [
  ['btCalcular', 'btCalcular'],
  ['btConsultar', 'btConsultar'],
  ['btCancelar', 'btCancelar'],
  ['btImportar', 'btImportar'],
  ['btFiltros', 'btFiltros'],
  ['btSelecaoPedido', 'btSelecaoPedido'],
] as [string, string][];

/** Ícones da barra CSW / Semantic UI: <i class="info large icon"> */
const ICONES_TELA = [
  ['info', 'info large icon'],
  ['help', 'help large icon'],
  ['fechar (close)', 'close large icon'],
  ['maximizar (expand)', 'expand large icon'],
  ['restaurar (compress)', 'compress large icon'],
  ['configurações (setting)', 'setting large icon'],
  ['atualizar (refresh)', 'refresh large icon'],
  ['buscar (search)', 'search large icon'],
  ['filtrar (filter)', 'filter large icon'],
  ['fixar (pin)', 'pin large icon'],
  ['início (home)', 'home large icon'],
  ['salvar (save)', 'save large icon'],
  ['imprimir (print)', 'print large icon'],
  ['baixar (download)', 'download large icon'],
  ['enviar (upload)', 'upload large icon'],
  ['editar (edit)', 'edit large icon'],
  ['excluir (trash)', 'trash large icon'],
  ['adicionar (plus)', 'plus large icon'],
  ['remover (minus)', 'minus large icon'],
  ['confirmar (check)', 'check circle large icon'],
  ['aviso (warning)', 'warning sign large icon'],
  ['voltar (←)', 'angle left large icon'],
  ['avançar (→)', 'angle right large icon'],
  ['menu (⋯)', 'ellipsis horizontal large icon'],
  ['anexar (attach)', 'attach large icon'],
  ['desvincular (unlink)', 'unlink large icon'],
] as [string, string][];

const RPA_BLOCK_DEFS = [
  {
    type: 'rpa_inicio',
    message0: 'quando executar %1',
    args0: [
      {
        type: 'field_input',
        name: 'NOME',
        text: 'processo',
      },
    ],
    nextStatement: null,
    colour: 65,
    hat: 'cap',
    tooltip: 'Ponto de entrada do processo RPA.',
  },
  {
    type: 'rpa_abrir_url',
    message0: 'abrir link %1',
    args0: [
      {
        type: 'field_input',
        name: 'URL',
        text: 'https://',
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: 65,
    tooltip: 'Abre o endereço do sistema no navegador (ex.: homologação).',
  },
  {
    type: 'rpa_clicar',
    message0: 'clicar em %1',
    args0: [
      {
        type: 'field_input',
        name: 'SELETOR',
        text: '#campo',
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: 120,
    tooltip: 'Clica em um campo, botão ou elemento da tela (seletor CSS ou nome).',
  },
  {
    type: 'rpa_duplo_clique',
    message0: 'duplo clique em %1',
    args0: [
      {
        type: 'field_input',
        name: 'SELETOR',
        text: '#campo',
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: 120,
    tooltip: 'Duplo clique em um elemento da tela.',
  },
  {
    type: 'rpa_digitar_texto',
    message0: 'digitar %1',
    args0: [
      {
        type: 'field_input',
        name: 'TEXTO',
        text: 'texto',
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: 120,
    tooltip: 'Digita texto no foco atual (sem selecionar campo).',
  },
  {
    type: 'rpa_digitar',
    message0: 'digitar %1 no campo %2',
    args0: [
      {
        type: 'field_input',
        name: 'TEXTO',
        text: 'texto',
      },
      {
        type: 'field_input',
        name: 'SELETOR',
        text: '#campo',
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: 120,
    tooltip: 'Digita texto em um campo específico.',
  },
  {
    type: 'rpa_tecla',
    message0: 'pressionar tecla %1',
    args0: [
      {
        type: 'field_dropdown',
        name: 'TECLA',
        options: TECLAS_ATALHO,
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: 120,
    tooltip: 'Pressiona uma tecla (F1 a F12, Enter, Tab, Esc).',
  },
  {
    type: 'rpa_atalho_ctrl_espaco',
    message0: 'pressionar Ctrl + Espaço',
    previousStatement: null,
    nextStatement: null,
    colour: 120,
    tooltip: 'Atalho Ctrl + Espaço (abrir assistente / autocomplete).',
  },
  {
    type: 'rpa_atalho_teclas',
    message0: 'pressionar atalho %1 + %2',
    args0: [
      {
        type: 'field_dropdown',
        name: 'MODIFICADOR',
        options: MODIFICADORES,
      },
      {
        type: 'field_input',
        name: 'TECLA',
        text: 'A',
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: 120,
    tooltip: 'Combinação de teclas (ex.: Alt+A, Ctrl+S, Alt+F4). Digite a tecla: letra, F1–F12, Enter, Tab…',
  },
  {
    type: 'rpa_seta',
    message0: 'pressionar seta %1',
    args0: [
      {
        type: 'field_dropdown',
        name: 'SETA',
        options: SETAS,
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: 120,
    tooltip: 'Pressiona uma tecla direcional do teclado.',
  },
  {
    type: 'rpa_ir_botao',
    message0: 'ir para o botão %1',
    args0: [
      {
        type: 'field_dropdown',
        name: 'BOTAO',
        options: BOTOES_SISTEMA,
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: 120,
    tooltip: 'Foca no botão do sistema (btCalcular, btConsultar, etc.).',
  },
  {
    type: 'rpa_ir_botao_outro',
    message0: 'ir para outro botão %1',
    args0: [
      {
        type: 'field_input',
        name: 'BOTAO',
        text: 'btMeuBotao',
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: 120,
    tooltip: 'Foca em qualquer botão — digite o id (ex.: btExportar).',
  },
  {
    type: 'rpa_clicar_icone',
    message0: 'clicar no ícone %1',
    args0: [
      {
        type: 'field_dropdown',
        name: 'ICONE',
        options: ICONES_TELA,
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: 290,
    tooltip: 'Clica em ícone da barra da tela (ex.: info large icon).',
  },
  {
    type: 'rpa_clicar_icone_outro',
    message0: 'clicar em outro ícone %1',
    args0: [
      {
        type: 'field_input',
        name: 'ICONE',
        text: 'info large icon',
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: 290,
    tooltip: 'Clica em ícone pelas classes CSS (ex.: info large icon).',
  },
  {
    type: 'rpa_verificar_tela',
    message0: 'verificar tela %1 aberta ícone %2',
    args0: [
      {
        type: 'field_input',
        name: 'TELA',
        text: 'Minha tela',
      },
      {
        type: 'field_dropdown',
        name: 'ICONE',
        options: ICONES_TELA,
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: 210,
    tooltip: 'Confirma que a tela certa abriu — espera o ícone aparecer (falha se não achar).',
  },
  {
    type: 'rpa_verificar_tela_outro',
    message0: 'verificar tela %1 aberta ícone %2',
    args0: [
      {
        type: 'field_input',
        name: 'TELA',
        text: 'Minha tela',
      },
      {
        type: 'field_input',
        name: 'ICONE',
        text: 'info large icon',
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: 210,
    tooltip: 'Confirma tela pelo ícone com classes livres (ex.: info large icon).',
  },
  {
    type: 'rpa_se_tela_aberta',
    message0: 'se tela %1 aberta ícone %2',
    args0: [
      {
        type: 'field_input',
        name: 'TELA',
        text: 'Minha tela',
      },
      {
        type: 'field_dropdown',
        name: 'ICONE',
        options: ICONES_TELA,
      },
    ],
    message1: 'então %1',
    args1: [
      {
        type: 'input_statement',
        name: 'DO',
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: 210,
    tooltip: 'Só executa os blocos internos se o ícone da tela estiver visível.',
  },
  {
    type: 'rpa_se_tela_aberta_outro',
    message0: 'se tela %1 aberta ícone %2',
    args0: [
      {
        type: 'field_input',
        name: 'TELA',
        text: 'Minha tela',
      },
      {
        type: 'field_input',
        name: 'ICONE',
        text: 'info large icon',
      },
    ],
    message1: 'então %1',
    args1: [
      {
        type: 'input_statement',
        name: 'DO',
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: 210,
    tooltip: 'Condição com classes de ícone livres (ex.: info large icon).',
  },
  {
    type: 'rpa_captura_tela',
    message0: 'captura de tela salvar como %1',
    args0: [
      {
        type: 'field_input',
        name: 'ARQUIVO',
        text: 'captura.png',
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: 120,
    tooltip: 'Salva uma captura de tela da página atual.',
  },
  {
    type: 'rpa_esperar',
    message0: 'esperar %1 segundos',
    args0: [
      {
        type: 'field_number',
        name: 'SEGUNDOS',
        value: 0.5,
        min: 0,
        precision: 0.1,
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: 20,
    tooltip: 'Pausa a execução por alguns segundos.',
  },
  {
    type: 'rpa_esperar_elemento',
    message0: 'esperar elemento %1 aparecer',
    args0: [
      {
        type: 'field_input',
        name: 'SELETOR',
        text: '#elemento',
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: 20,
    tooltip: 'Aguarda um elemento ficar visível na tela.',
  },
  {
    type: 'rpa_esperar_usuario',
    message0: 'esperar usuário %1 pressionar %2',
    args0: [
      {
        type: 'field_input',
        name: 'MENSAGEM',
        text: 'conferir e continuar',
      },
      {
        type: 'field_dropdown',
        name: 'TECLA',
        options: TECLAS_ESPERA_USUARIO,
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: 20,
    tooltip: 'Pausa o robô até o operador pressionar a tecla (ex.: Esc) na janela.',
  },
  {
    type: 'rpa_esperar_usuario_terminal',
    message0: 'esperar usuário no terminal %1',
    args0: [
      {
        type: 'field_input',
        name: 'MENSAGEM',
        text: 'Pressione Enter para continuar...',
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: 20,
    tooltip: 'Pausa e espera Enter no prompt do terminal (fora do navegador).',
  },
  {
    type: 'rpa_se_elemento_existe',
    message0: 'se elemento %1 existe',
    args0: [
      {
        type: 'field_input',
        name: 'SELETOR',
        text: '#elemento',
      },
    ],
    message1: 'então %1',
    args1: [
      {
        type: 'input_statement',
        name: 'DO',
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: 210,
    tooltip: 'Executa os blocos internos somente se o elemento existir na tela.',
  },
] as const;

let registered = false;

export function registerRpaBlocks() {
  if (registered) return;
  Blockly.common.defineBlocksWithJsonArray(RPA_BLOCK_DEFS as never);
  registered = true;
}

export const RPA_TOOLBOX = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: 'Início',
      colour: 65,
      contents: [
        { kind: 'block', type: 'rpa_inicio' },
        { kind: 'block', type: 'rpa_abrir_url' },
      ],
    },
    {
      kind: 'category',
      name: 'Ações',
      colour: 120,
      contents: [
        { kind: 'block', type: 'rpa_clicar' },
        { kind: 'block', type: 'rpa_duplo_clique' },
        { kind: 'block', type: 'rpa_digitar_texto' },
        { kind: 'block', type: 'rpa_digitar' },
        { kind: 'block', type: 'rpa_tecla' },
        { kind: 'block', type: 'rpa_atalho_ctrl_espaco' },
        { kind: 'block', type: 'rpa_atalho_teclas' },
        { kind: 'block', type: 'rpa_seta' },
        { kind: 'block', type: 'rpa_ir_botao' },
        { kind: 'block', type: 'rpa_ir_botao_outro' },
        { kind: 'block', type: 'rpa_captura_tela' },
      ],
    },
    {
      kind: 'category',
      name: 'Ícones / Tela',
      colour: 290,
      contents: [
        { kind: 'block', type: 'rpa_clicar_icone' },
        { kind: 'block', type: 'rpa_clicar_icone_outro' },
        { kind: 'block', type: 'rpa_verificar_tela' },
        { kind: 'block', type: 'rpa_verificar_tela_outro' },
        { kind: 'block', type: 'rpa_se_tela_aberta' },
        { kind: 'block', type: 'rpa_se_tela_aberta_outro' },
      ],
    },
    {
      kind: 'category',
      name: 'Controle',
      colour: 20,
      contents: [
        { kind: 'block', type: 'rpa_esperar' },
        { kind: 'block', type: 'rpa_esperar_elemento' },
        { kind: 'block', type: 'rpa_esperar_usuario' },
        { kind: 'block', type: 'rpa_esperar_usuario_terminal' },
        { kind: 'block', type: 'rpa_se_elemento_existe' },
        {
          kind: 'block',
          type: 'controls_repeat_ext',
          inputs: {
            TIMES: { shadow: { type: 'math_number', fields: { NUM: 3 } } },
          },
        },
        { kind: 'block', type: 'controls_if' },
      ],
    },
    {
      kind: 'category',
      name: 'Valores',
      colour: 160,
      contents: [
        { kind: 'block', type: 'text' },
        { kind: 'block', type: 'math_number' },
        { kind: 'block', type: 'logic_compare' },
      ],
    },
  ],
} as const;
