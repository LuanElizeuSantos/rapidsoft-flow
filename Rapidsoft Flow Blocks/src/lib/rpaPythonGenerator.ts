import { pythonGenerator } from 'blockly/python';
import type { Block, Workspace } from 'blockly/core';

let registered = false;

function escPy(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function seletorBotao(id: string): string {
  const limpo = id.replace(/[^a-zA-Z0-9_-]/g, '');
  return `#${limpo}`;
}

function codigoIrBotao(botao: string): string {
  const seletor = escPy(seletorBotao(botao));
  return [
    `_btn = page.locator("${seletor}")\n`,
    `_btn.wait_for(state="visible", timeout=5000)\n`,
    `_btn.focus()\n`,
  ].join('');
}

/** "info large icon" → seletor i.info.large.icon */
function classesIconeParaSeletor(classes: string): string {
  const partes = classes
    .trim()
    .split(/\s+/)
    .map((c) => c.replace(/[^a-zA-Z0-9_-]/g, ''))
    .filter(Boolean);
  if (!partes.length) return 'i.icon';
  return `i.${partes.join('.')}`;
}

function codigoClicarIcone(classes: string): string {
  const seletor = escPy(classesIconeParaSeletor(classes));
  return [
    `_ico = page.locator("${seletor}")\n`,
    `_ico.wait_for(state="visible", timeout=5000)\n`,
    `_ico.first.click()\n`,
  ].join('');
}

function codigoVerificarTela(nomeTela: string, classes: string): string {
  const seletor = escPy(classesIconeParaSeletor(classes));
  const label = escPy(nomeTela || 'tela');
  return [
    `# Confirma tela aberta: ${label}\n`,
    `page.wait_for_selector("${seletor}", state="visible", timeout=10000)\n`,
    `assert page.locator("${seletor}").first.is_visible(), `,
    `"Tela incorreta (${label}): ícone não encontrado (${classesIconeParaSeletor(classes)})"\n`,
  ].join('');
}

function codigoSeTelaAberta(nomeTela: string, classes: string, branch: string): string {
  const seletor = escPy(classesIconeParaSeletor(classes));
  const label = escPy(nomeTela || 'tela');
  const corpo = branch || `${pythonGenerator.INDENT}pass\n`;
  return [
    `# Se tela aberta: ${label}\n`,
    `_tela = page.locator("${seletor}")\n`,
    `if _tela.count() > 0 and _tela.first.is_visible():\n`,
    corpo,
  ].join('');
}

export function registerRpaPythonGenerators() {
  if (registered) return;

  pythonGenerator.forBlock.rpa_inicio = (block: Block) => {
    const nome = block.getFieldValue('NOME') || 'processo';
    return `# Início: ${escPy(nome)}\n`;
  };

  pythonGenerator.forBlock.rpa_abrir_url = (block: Block) => {
    const url = escPy(block.getFieldValue('URL') || 'https://');
    return [
      `page.goto("${url}", wait_until="domcontentloaded")\n`,
    ].join('');
  };

  pythonGenerator.forBlock.rpa_clicar = (block: Block) => {
    const seletor = escPy(block.getFieldValue('SELETOR') || '#campo');
    return `clicar(page, "${seletor}")\n`;
  };

  pythonGenerator.forBlock.rpa_duplo_clique = (block: Block) => {
    const seletor = escPy(block.getFieldValue('SELETOR') || '#campo');
    return `page.dblclick("${seletor}")\n`;
  };

  pythonGenerator.forBlock.rpa_digitar_texto = (block: Block) => {
    const texto = escPy(block.getFieldValue('TEXTO') || '');
    return `page.keyboard.type("${texto}")\n`;
  };

  pythonGenerator.forBlock.rpa_digitar = (block: Block) => {
    const texto = escPy(block.getFieldValue('TEXTO') || '');
    const seletor = escPy(block.getFieldValue('SELETOR') || '#campo');
    return `page.fill("${seletor}", "${texto}")\n`;
  };

  pythonGenerator.forBlock.rpa_tecla = (block: Block) => {
    const tecla = block.getFieldValue('TECLA') || 'Enter';
    return `pressionar_tecla(page, "${tecla}")\n`;
  };

  pythonGenerator.forBlock.rpa_atalho_ctrl_espaco = () => (
    'page.keyboard.press("Control+Space")\n'
  );

  pythonGenerator.forBlock.rpa_atalho_teclas = (block: Block) => {
    const mod = block.getFieldValue('MODIFICADOR') || 'Alt';
    const tecla = (block.getFieldValue('TECLA') || 'A').trim();
    const atalho = `${mod}+${tecla}`;
    return `pressionar_tecla(page, "${escPy(atalho)}")\n`;
  };

  pythonGenerator.forBlock.rpa_seta = (block: Block) => {
    const seta = block.getFieldValue('SETA') || 'ArrowDown';
    return `page.keyboard.press("${seta}")\n`;
  };

  pythonGenerator.forBlock.rpa_ir_botao = (block: Block) => {
    const botao = block.getFieldValue('BOTAO') || 'btCalcular';
    return codigoIrBotao(botao);
  };

  pythonGenerator.forBlock.rpa_ir_botao_outro = (block: Block) => {
    const botao = block.getFieldValue('BOTAO') || 'btMeuBotao';
    return codigoIrBotao(botao);
  };

  pythonGenerator.forBlock.rpa_clicar_icone = (block: Block) => {
    const classes = block.getFieldValue('ICONE') || 'info large icon';
    return codigoClicarIcone(classes);
  };

  pythonGenerator.forBlock.rpa_clicar_icone_outro = (block: Block) => {
    const classes = block.getFieldValue('ICONE') || 'info large icon';
    return codigoClicarIcone(classes);
  };

  pythonGenerator.forBlock.rpa_verificar_tela = (block: Block) => {
    const tela = block.getFieldValue('TELA') || 'tela';
    const classes = block.getFieldValue('ICONE') || 'info large icon';
    return codigoVerificarTela(tela, classes);
  };

  pythonGenerator.forBlock.rpa_verificar_tela_outro = (block: Block) => {
    const tela = block.getFieldValue('TELA') || 'tela';
    const classes = block.getFieldValue('ICONE') || 'info large icon';
    return codigoVerificarTela(tela, classes);
  };

  pythonGenerator.forBlock.rpa_se_tela_aberta = (block: Block) => {
    const tela = block.getFieldValue('TELA') || 'tela';
    const classes = block.getFieldValue('ICONE') || 'info large icon';
    const branch = pythonGenerator.statementToCode(block, 'DO');
    return codigoSeTelaAberta(tela, classes, branch);
  };

  pythonGenerator.forBlock.rpa_se_tela_aberta_outro = (block: Block) => {
    const tela = block.getFieldValue('TELA') || 'tela';
    const classes = block.getFieldValue('ICONE') || 'info large icon';
    const branch = pythonGenerator.statementToCode(block, 'DO');
    return codigoSeTelaAberta(tela, classes, branch);
  };

  pythonGenerator.forBlock.rpa_captura_tela = (block: Block) => {
    const arquivo = escPy(block.getFieldValue('ARQUIVO') || 'captura.png');
    return `page.screenshot(path="${arquivo}")\n`;
  };

  pythonGenerator.forBlock.rpa_esperar = (block: Block) => {
    const segundos = block.getFieldValue('SEGUNDOS') || 0.5;
    return `time.sleep(${segundos})\n`;
  };

  pythonGenerator.forBlock.rpa_esperar_elemento = (block: Block) => {
    const seletor = escPy(block.getFieldValue('SELETOR') || '#elemento');
    return `page.wait_for_selector("${seletor}")\n`;
  };

  pythonGenerator.forBlock.rpa_esperar_usuario = (block: Block) => {
    const mensagem = escPy(block.getFieldValue('MENSAGEM') || 'continuar');
    const tecla = block.getFieldValue('TECLA') || 'Escape';
    return `aguardar_tecla_usuario(page, "${escPy(tecla)}", "${mensagem}")\n`;
  };

  pythonGenerator.forBlock.rpa_esperar_usuario_terminal = (block: Block) => {
    const mensagem = escPy(block.getFieldValue('MENSAGEM') || 'Pressione Enter para continuar...');
    return `input("${mensagem}")\n`;
  };

  pythonGenerator.forBlock.rpa_se_elemento_existe = (block: Block) => {
    const seletor = escPy(block.getFieldValue('SELETOR') || '#elemento');
    const branch = pythonGenerator.statementToCode(block, 'DO');
    const corpo = branch || `${pythonGenerator.INDENT}pass\n`;
    return [
      `_elem = page.locator("${seletor}")\n`,
      `if _elem.count() > 0 and _elem.first.is_visible():\n`,
      corpo,
    ].join('');
  };

  registered = true;
}

const HELPER_ESPERA_USUARIO = [
  'def aguardar_tecla_usuario(page, tecla: str, mensagem: str = "") -> None:',
  '    """Pausa até o operador pressionar a tecla na janela do navegador.',
  '',
  '    Instala o escutador em TODOS os frames (o ERP usa iframes), então',
  '    funciona mesmo que o foco esteja dentro de um quadro interno.',
  '    """',
  '    if mensagem:',
  '        try:',
  '            print(f"Aguardando: {mensagem} - pressione {tecla} na janela do navegador.")',
  '        except Exception:',
  '            pass',
  '    page.bring_to_front()',
  '    instalar = """(key) => {',
  '        if (window.__rpaKeyInstalada) { return; }',
  '        window.__rpaKeyInstalada = true;',
  '        window.__rpaKeyPressionada = false;',
  '        document.addEventListener("keydown", (event) => {',
  '            if (event.key === key) { window.__rpaKeyPressionada = true; }',
  '        }, true);',
  '    }"""',
  '    def instalar_em_frames():',
  '        for frame in page.frames:',
  '            try:',
  '                frame.evaluate(instalar, tecla)',
  '            except Exception:',
  '                pass',
  '    instalar_em_frames()',
  '    while True:',
  '        instalar_em_frames()',
  '        for frame in page.frames:',
  '            try:',
  '                if frame.evaluate("() => window.__rpaKeyPressionada === true"):',
  '                    for f in page.frames:',
  '                        try:',
  '                            f.evaluate("() => { window.__rpaKeyPressionada = false; }")',
  '                        except Exception:',
  '                            pass',
  '                    return',
  '            except Exception:',
  '                pass',
  '        time.sleep(0.15)',
].join('\n');

const HELPER_PRESSIONAR_TECLA = [
  'def pressionar_tecla(page, tecla: str) -> None:',
  '    """Pressiona uma tecla. Para teclas de função (F1-F12) o evento é',
  '    disparado DENTRO do quadro (iframe) que está com foco, porque o',
  '    o ERP escuta essas teclas via JavaScript e a tecla \\"real\\" do',
  '    navegador nem sempre chega ao quadro certo.',
  '    """',
  '    teclas_funcao = {f"F{i}": 111 + i for i in range(1, 13)}',
  '    if tecla not in teclas_funcao:',
  '        page.keyboard.press(tecla)',
  '        return',
  '    code = teclas_funcao[tecla]',
  '    disparar = """([key, code]) => {',
  '        if (!document.hasFocus || !document.hasFocus()) { return false; }',
  '        const alvo = document.activeElement || document.body;',
  '        for (const tipo of ["keydown", "keyup"]) {',
  '            alvo.dispatchEvent(new KeyboardEvent(tipo, {',
  '                key: key, code: key, keyCode: code, which: code,',
  '                bubbles: true, cancelable: true',
  '            }));',
  '        }',
  '        return true;',
  '    }"""',
  '    enviado = False',
  '    for frame in page.frames:',
  '        try:',
  '            if frame.evaluate(disparar, [tecla, code]):',
  '                enviado = True',
  '        except Exception:',
  '            pass',
  '    if not enviado:',
  '        page.keyboard.press(tecla)',
].join('\n');

const HELPER_CLICAR = [
  'def clicar(page, seletor: str) -> None:',
  '    """Clica no primeiro elemento VISÍVEL que combina com o seletor.',
  '',
  '    O ERP repete o mesmo seletor em vários campos (ex.: o ícone ⋮',
  '    aparece em cada campo). Clicar sempre no primeiro visível evita o erro',
  '    de \\"vários elementos encontrados\\" e ignora os que estão escondidos.',
  '    """',
  '    itens = page.locator(seletor)',
  '    try:',
  '        total = itens.count()',
  '    except Exception:',
  '        total = 0',
  '    for i in range(total):',
  '        alvo = itens.nth(i)',
  '        try:',
  '            if alvo.is_visible():',
  '                alvo.click()',
  '                return',
  '        except Exception:',
  '            pass',
  '    itens.first.click()',
].join('\n');

export function gerarPythonDoWorkspace(workspace: Workspace): string {
  const corpo = pythonGenerator.workspaceToCode(workspace);

  if (!corpo.trim()) {
    return '# Nenhum bloco na tela.\n# Arraste o bloco "Início" e as ações para gerar o script Python.\n';
  }

  const linhas = [
    '"""',
    'Script RPA gerado pelo Rapidsoft Flow Blocks.',
    'Requer: pip install playwright && playwright install',
    '"""',
    'import time',
    'from playwright.sync_api import sync_playwright',
    '',
    '',
  ];

  if (corpo.includes('aguardar_tecla_usuario(')) {
    linhas.push(HELPER_ESPERA_USUARIO, '', '');
  }

  if (corpo.includes('pressionar_tecla(')) {
    linhas.push(HELPER_PRESSIONAR_TECLA, '', '');
  }

  if (corpo.includes('clicar(')) {
    linhas.push(HELPER_CLICAR, '', '');
  }

  const header = linhas.join('\n');

  return `${header}def run(page):\n${indentar(corpo)}\n\n\ndef main():\n    with sync_playwright() as p:\n        browser = p.chromium.launch(headless=False)\n        context = browser.new_context(ignore_https_errors=True)\n        page = context.new_page()\n        try:\n            run(page)\n        except Exception as exc:\n            print(f"Erro durante o RPA: {exc}")\n            input("Pressione Enter para fechar o navegador...")\n            raise\n        input("Processo concluído. Pressione Enter para fechar o navegador...")\n        context.close()\n        browser.close()\n\n\nif __name__ == "__main__":\n    main()\n`;
}

function indentar(code: string): string {
  return code
    .split('\n')
    .map((line) => (line.trim() ? `    ${line}` : line))
    .join('\n');
}
