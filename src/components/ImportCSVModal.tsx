import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2, Download } from 'lucide-react';
import Modal from './Modal';
import { cn } from './ui/utils';
import type { CreateApostaPayload } from '../services/api/apostaService';

interface Banca {
    id: string;
    nome: string;
}

interface ImportCSVModalProps {
    isOpen: boolean;
    onClose: () => void;
    bancas: Banca[];
    defaultBancaId?: string;
    onImportSuccess: () => void;
}

interface CSVRow {
    Date: string;
    Type: string;
    Sport: string;
    Label: string;
    Odds: string;
    Stake: string;
    State: string;
    Bookmaker: string;
    Tipster: string;
}

interface ValidationResult {
    valid: boolean;
    errors: string[];
}

interface ParsedBet {
    row: number;
    data: CreateApostaPayload;
    valid: boolean;
    errors: string[];
}

const STATUS_MAP: Record<string, string> = {
    'W': 'Green',
    'L': 'Red',
    'R': 'Reembolso',
    'V': 'Void',
};

export default function ImportCSVModal({
    isOpen,
    onClose,
    bancas,
    defaultBancaId,
    onImportSuccess,
}: ImportCSVModalProps) {
    const [selectedBancaId, setSelectedBancaId] = useState(defaultBancaId || '');
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<ParsedBet[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
    const [importResult, setImportResult] = useState<{ success: number; errors: number } | null>(null);
    const [dragActive, setDragActive] = useState(false);

    const validateCSVRow = (row: CSVRow, rowNumber: number): ValidationResult => {
        const errors: string[] = [];

        if (!row.Date?.trim()) errors.push(`Linha ${rowNumber}: Data é obrigatória`);
        if (!row.Sport?.trim()) errors.push(`Linha ${rowNumber}: Esporte é obrigatório`);
        if (!row.Label?.trim()) errors.push(`Linha ${rowNumber}: Label/Jogo é obrigatório`);
        if (!row.Odds?.trim()) errors.push(`Linha ${rowNumber}: Odd é obrigatória`);
        if (!row.Stake?.trim()) errors.push(`Linha ${rowNumber}: Stake é obrigatório`);
        if (!row.State?.trim()) errors.push(`Linha ${rowNumber}: State é obrigatório`);
        if (!row.Bookmaker?.trim()) errors.push(`Linha ${rowNumber}: Bookmaker é obrigatório`);

        // Validar formato da data
        if (row.Date) {
            const datePattern = /^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}$/;
            if (!datePattern.test(row.Date)) {
                errors.push(`Linha ${rowNumber}: Data inválida (esperado: YYYY-MM-DD HH:mm)`);
            }
        }

        // Validar valores numéricos
        const odd = parseFloat(row.Odds?.replace(',', '.'));
        const stake = parseFloat(row.Stake?.replace(',', '.'));

        if (isNaN(odd) || odd <= 0) {
            errors.push(`Linha ${rowNumber}: Odd deve ser um número positivo`);
        }
        if (isNaN(stake) || stake <= 0) {
            errors.push(`Linha ${rowNumber}: Stake deve ser um número positivo`);
        }

        return { valid: errors.length === 0, errors };
    };

    const mapCSVToAposta = (row: CSVRow, bancaId: string): CreateApostaPayload => {
        const odd = parseFloat(row.Odds.replace(',', '.'));
        const stake = parseFloat(row.Stake.replace(',', '.'));
        const status = STATUS_MAP[row.State] || 'Pendente';

        // Calcular retorno para apostas ganhas
        let retornoObtido: number | undefined;
        if (status === 'Green') {
            retornoObtido = stake * odd;
        } else if (status === 'Red') {
            retornoObtido = 0;
        } else if (status === 'Reembolso') {
            retornoObtido = stake;
        }

        // Converter data do formato "YYYY-MM-DD HH:mm" para ISO
        const [datePart, timePart] = row.Date.split(' ');
        const isoDate = `${datePart}T${timePart}:00.000Z`;

        return {
            bancaId,
            esporte: row.Sport.trim(),
            jogo: row.Label.trim(),
            torneio: '',
            pais: '',
            mercado: row.Label.trim(), // Usar label como mercado por padrão
            tipoAposta: row.Type || 'Simple',
            valorApostado: stake,
            odd,
            bonus: 0,
            dataJogo: isoDate,
            tipster: row.Tipster?.trim() || '',
            status,
            casaDeAposta: row.Bookmaker.trim(),
            retornoObtido,
        };
    };

    const handleFileChange = useCallback((selectedFile: File | null) => {
        if (!selectedFile) {
            setFile(null);
            setParsedData([]);
            setImportResult(null);
            return;
        }

        if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
            alert('Por favor, selecione um arquivo CSV válido.');
            return;
        }

        setFile(selectedFile);
        setImportResult(null);

        Papa.parse<CSVRow>(selectedFile, {
            header: true,
            delimiter: ';',
            skipEmptyLines: true,
            complete: (results) => {
                const parsed: ParsedBet[] = results.data.map((row, index) => {
                    const rowNumber = index + 2; // +2 porque linha 1 é header
                    const validation = validateCSVRow(row, rowNumber);

                    if (!validation.valid) {
                        return {
                            row: rowNumber,
                            data: {} as CreateApostaPayload,
                            valid: false,
                            errors: validation.errors,
                        };
                    }

                    return {
                        row: rowNumber,
                        data: mapCSVToAposta(row, selectedBancaId),
                        valid: true,
                        errors: [],
                    };
                });

                setParsedData(parsed);
            },
            error: (error) => {
                console.error('Erro ao fazer parse do CSV:', error);
                alert('Erro ao processar arquivo CSV. Verifique o formato do arquivo.');
            },
        });
    }, [selectedBancaId]);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileChange(e.dataTransfer.files[0]);
        }
    }, [handleFileChange]);

    const handleImport = async () => {
        if (!selectedBancaId) {
            alert('Por favor, selecione uma banca.');
            return;
        }

        const validBets = parsedData.filter(bet => bet.valid);
        if (validBets.length === 0) {
            alert('Nenhuma aposta válida para importar.');
            return;
        }

        setIsImporting(true);
        setImportProgress({ current: 0, total: validBets.length });

        try {
            const { apostaService } = await import('../services/api/apostaService');

            let successCount = 0;
            let errorCount = 0;

            // Importar em lotes de 10
            const batchSize = 10;
            for (let i = 0; i < validBets.length; i += batchSize) {
                const batch = validBets.slice(i, i + batchSize);

                const results = await Promise.allSettled(
                    batch.map(bet => apostaService.create(bet.data))
                );

                results.forEach(result => {
                    if (result.status === 'fulfilled') {
                        successCount++;
                    } else {
                        errorCount++;
                        console.error('Erro ao importar aposta:', result.reason);
                    }
                });

                setImportProgress({ current: i + batch.length, total: validBets.length });
            }

            setImportResult({ success: successCount, errors: errorCount });

            if (successCount > 0) {
                setTimeout(() => {
                    onImportSuccess();
                    if (errorCount === 0) {
                        onClose();
                    }
                }, 2000);
            }
        } catch (error) {
            console.error('Erro durante importação:', error);
            alert('Erro ao importar apostas. Verifique o console para mais detalhes.');
        } finally {
            setIsImporting(false);
        }
    };

    const validCount = parsedData.filter(bet => bet.valid).length;
    const invalidCount = parsedData.filter(bet => !bet.valid).length;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Importar Dados CSV" size="lg">
            <div className="space-y-6">
                {/* Seleção de Banca */}
                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                        Banca de destino
                    </label>
                    <select
                        value={selectedBancaId}
                        onChange={(e) => {
                            setSelectedBancaId(e.target.value);
                            // Re-parse se já tiver arquivo
                            if (file) {
                                handleFileChange(file);
                            }
                        }}
                        className="w-full rounded-2xl border border-border/40 bg-background px-4 py-3 text-sm text-foreground transition focus-visible:border-brand-emerald focus-visible:ring-2 focus-visible:ring-brand-emerald/30"
                        disabled={isImporting}
                    >
                        <option value="">Selecione uma banca</option>
                        {bancas.map((banca) => (
                            <option key={banca.id} value={banca.id}>
                                {banca.nome}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Upload Area */}
                <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={cn(
                        'relative rounded-2xl border-2 border-dashed p-8 text-center transition',
                        dragActive
                            ? 'border-brand-emerald bg-brand-emerald/5'
                            : 'border-border/40 hover:border-border/60',
                        isImporting && 'pointer-events-none opacity-50'
                    )}
                >
                    <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                        className="absolute inset-0 cursor-pointer opacity-0"
                        disabled={isImporting}
                    />
                    <div className="flex flex-col items-center gap-3">
                        {file ? (
                            <>
                                <FileText className="h-12 w-12 text-brand-emerald" />
                                <p className="text-sm font-medium text-foreground">{file.name}</p>
                                <p className="text-xs text-foreground-muted">
                                    {(file.size / 1024).toFixed(2)} KB
                                </p>
                            </>
                        ) : (
                            <>
                                <Upload className="h-12 w-12 text-foreground-muted" />
                                <p className="text-sm font-medium text-foreground">
                                    Arraste um arquivo CSV aqui ou clique para selecionar
                                </p>
                                <p className="text-xs text-foreground-muted">
                                    Formato: Bet-Analytix (CSV com separador ;)
                                </p>
                            </>
                        )}
                    </div>
                </div>

                {/* Validation Summary */}
                {parsedData.length > 0 && (
                    <div className="rounded-2xl border border-border/40 bg-background/50 p-4">
                        <h4 className="mb-3 text-sm font-semibold text-foreground">Resumo da Validação</h4>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <p className="text-2xl font-bold text-foreground">{parsedData.length}</p>
                                <p className="text-xs text-foreground-muted">Total de linhas</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-emerald-400">{validCount}</p>
                                <p className="text-xs text-foreground-muted">Válidas</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-rose-400">{invalidCount}</p>
                                <p className="text-xs text-foreground-muted">Com erros</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Errors List */}
                {invalidCount > 0 && (
                    <div className="max-h-40 overflow-y-auto rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-rose-400">
                            <AlertCircle size={16} />
                            Erros encontrados
                        </div>
                        <ul className="space-y-1 text-xs text-rose-300">
                            {parsedData
                                .filter(bet => !bet.valid)
                                .flatMap(bet => bet.errors)
                                .slice(0, 10)
                                .map((error, index) => (
                                    <li key={index}>• {error}</li>
                                ))}
                            {parsedData.filter(bet => !bet.valid).flatMap(bet => bet.errors).length > 10 && (
                                <li className="italic text-rose-300/70">
                                    ... e mais {parsedData.filter(bet => !bet.valid).flatMap(bet => bet.errors).length - 10} erros
                                </li>
                            )}
                        </ul>
                    </div>
                )}

                {/* Import Progress */}
                {isImporting && (
                    <div className="rounded-2xl border border-border/40 bg-background/50 p-4">
                        <div className="mb-2 flex items-center justify-between text-sm">
                            <span className="font-medium text-foreground">Importando apostas...</span>
                            <span className="text-foreground-muted">
                                {importProgress.current} / {importProgress.total}
                            </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-background">
                            <div
                                className="h-full bg-gradient-to-r from-brand-emerald to-emerald-400 transition-all duration-300"
                                style={{
                                    width: `${(importProgress.current / importProgress.total) * 100}%`,
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* Import Result */}
                {importResult && (
                    <div
                        className={cn(
                            'rounded-2xl border p-4',
                            importResult.errors === 0
                                ? 'border-emerald-500/20 bg-emerald-500/5'
                                : 'border-yellow-500/20 bg-yellow-500/5'
                        )}
                    >
                        <div className="flex items-center gap-2 text-sm font-semibold">
                            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                            <span className="text-foreground">Importação concluída!</span>
                        </div>
                        <p className="mt-2 text-sm text-foreground-muted">
                            {importResult.success} apostas importadas com sucesso
                            {importResult.errors > 0 && ` • ${importResult.errors} falharam`}
                        </p>
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isImporting}
                        className="rounded-2xl border border-border/40 bg-background px-6 py-2 text-sm font-semibold text-foreground transition hover:border-border/60 disabled:opacity-50"
                    >
                        {importResult ? 'Fechar' : 'Cancelar'}
                    </button>
                    <button
                        type="button"
                        onClick={handleImport}
                        disabled={!selectedBancaId || validCount === 0 || isImporting}
                        className="inline-flex items-center gap-2 rounded-2xl bg-brand-linear px-6 py-2 text-sm font-semibold text-white shadow-glow transition hover:shadow-glow-lg disabled:opacity-50 disabled:shadow-none"
                    >
                        {isImporting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Importando...
                            </>
                        ) : (
                            <>
                                <Download size={16} />
                                Importar {validCount > 0 && `(${validCount})`}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
