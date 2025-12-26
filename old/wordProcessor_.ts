import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import * as FileSaverLib from 'file-saver';
import { UserData } from '../types';

// Compatibilidade ESM para file-saver
const saveAs = (FileSaverLib as any).default?.saveAs || (FileSaverLib as any).saveAs || FileSaverLib;

/**
 * Remove tags internas do Word (correção ortográfica, gramática, RSID, bookmarks)
 * que corrompem as variáveis do Docxtemplater (ex: {{<w:proofErr/>Nome}}).
 */
const cleanTemplateXML = (zip: PizZip) => {
    // Itera sobre todos os ficheiros XML do documento (corpo, cabeçalhos, rodapés)
    Object.keys(zip.files).forEach((filename) => {
        if (filename.match(/word\/(document|header\d+|footer\d+)\.xml/)) {
            let content = zip.files[filename].asText();
            
            // --- LIMPEZA AGRESSIVA DE ARTEFACTOS DO WORD ---
            
            // 1. Remove Proofing Errors (Spellcheck/Grammar) - Causador principal de "Duplicate tags"
            content = content.replace(/<w:proofErr(?: [^>]*)?\/>/g, "");
            content = content.replace(/<w:noProof(?: [^>]*)?\/>/g, "");
            
            // 2. Remove tags de idioma que aparecem a meio das palavras
            content = content.replace(/<w:lang(?: [^>]*)?\/>/g, "");
            
            // 3. Remove RSID (Revision Save ID) - O Word enche o XML disto quando se salva muitas vezes
            // Remove w:rsidR="..." e w:rsidRPr="..." de dentro das tags
            content = content.replace(/ w:rsidR="[^"]*"/g, "");
            content = content.replace(/ w:rsidRPr="[^"]*"/g, "");
            content = content.replace(/ w:rsidRDefault="[^"]*"/g, "");
            content = content.replace(/ w:rsidP="[^"]*"/g, "");

            // 4. Remove Bookmarks que possam ter sido criados acidentalmente na seleção
            content = content.replace(/<w:bookmarkStart(?: [^>]*)?\/>/g, "");
            content = content.replace(/<w:bookmarkEnd(?: [^>]*)?\/>/g, "");

            // 5. Tenta remover tags vazias que separam texto (ex: <w:r></w:r>)
            // Isso ajuda a juntar {{ e Titl que ficaram em runs separados
            // Nota: Regex em XML é frágil, mas resolve 80% dos casos simples
            
            zip.file(filename, content);
        }
    });
};

/**
 * Gera o Blob do documento preenchido sem baixar automaticamente.
 */
export const generateSignedBlob = async (
    templateFile: File,
    userData: UserData
): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(evt) {
            if (!evt.target?.result) {
                reject(new Error("Erro ao ler o template"));
                return;
            }

            try {
                const content = evt.target.result;
                const zip = new PizZip(content as string | ArrayBuffer);

                // --- CORREÇÃO AUTOMÁTICA DO TEMPLATE ---
                // Limpa o lixo do Word antes de tentar processar
                cleanTemplateXML(zip);
                // ----------------------------------------

                const doc = new Docxtemplater(zip, {
                    paragraphLoop: true,
                    linebreaks: true,
                    nullGetter: () => { return ""; } // Evita erro se faltar alguma variável secundária
                });

                const equipamentosParaImprimir = userData.equipamentos.filter(eq => eq.selecionado !== false);
                const dataFimFormatada = userData.dataFim ? new Date(userData.dataFim).toLocaleDateString('pt-PT') : "_______/_______/_______";

                // Mapping estendido para suportar tags do utilizador
                doc.render({
                    // Standard keys
                    nomeCompleto: userData.nomeCompleto,
                    funcao: userData.funcao || "",
                    email: userData.email || "",
                    empresa: userData.empresa || "",
                    dataAtual: new Date().toLocaleDateString('pt-PT'),
                    dataFim: dataFimFormatada,
                    equipamentos: equipamentosParaImprimir,

                    // Specific Template Tags requested by user
                    Title: userData.nomeCompleto,
                    EMAIL: userData.email || "",
                    fim: dataFimFormatada,
                });

                const out = doc.getZip().generate({
                    type: "blob",
                    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                });

                resolve(out);

            } catch (error: any) {
                console.error("Erro ao processar documento:", error);
                
                // Tratamento específico para erros do Docxtemplater
                if (error.properties && error.properties.errors) {
                    const multiErrors = error.properties.errors;
                    const errorMessages = multiErrors.map((e: any) => {
                        // Se mesmo após a limpeza automática der erro, avisamos o utilizador
                        if (e.properties && (e.properties.id === 'duplicate_open_tag' || e.properties.id === 'duplicate_close_tag')) {
                            return `A tag "${e.properties.xtag}" ainda está corrompida no ficheiro Word.\nSolução: Apague todo o bloco {{${e.properties.xtag.replace(/[{}]/g,'')}}} e escreva-o novamente manualmente (não copie e cole).`;
                        }
                        return e.message;
                    }).join('\n\n');
                    
                    reject(new Error("Erro no Template Word:\n" + errorMessages));
                } else {
                    reject(error);
                }
            }
        };

        reader.onerror = reject;
        reader.readAsBinaryString(templateFile);
    });
};

/**
 * Gera e baixa o documento.
 */
export const generateWordDocument = async (
  templateFile: File,
  userData: UserData
) => {
    try {
        const blob = await generateSignedBlob(templateFile, userData);
        const filename = `Termo_Devolucao_${userData.nomeCompleto.replace(/\s+/g, '_')}.docx`;
        saveAs(blob, filename);
    } catch (error) {
        throw error;
    }
};