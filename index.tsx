
import React, { useState, useEffect, FormEvent, useMemo } from 'react';
import ReactDOM from 'react-dom/client';

interface Transaction {
    id: string;
    date: string;
    type: 'Beli' | 'Jual'; // Beli: Beli uang asing (IDR -> Asing), Jual: Jual uang asing (Asing -> IDR)
    
    // Input Fields
    foreignCurrencyCode: string; // Kode mata uang asing yang ditransaksikan
    denomination: number;        // Nominal per lembar uang asing
    notesCount: number;          // Jumlah lembar
    exchangeRateToIDR: number;   // Kurs 1 mata uang asing ke IDR

    // Derived fields for consistent balance calculation and history display
    effectiveCurrencyFrom: string; // Mata uang yang berkurang saldonya
    effectiveAmountFrom: number;   // Jumlah yang berkurang
    effectiveCurrencyTo: string;   // Mata uang yang bertambah saldonya
    effectiveAmountTo: number;     // Jumlah yang bertambah

    notes?: string;
}

const CURRENCIES = [
    { code: 'IDR', name: 'Rupiah Indonesia' },
    { code: 'USD', name: 'Dolar AS' },
    { code: 'EUR', name: 'Euro' },
    { code: 'JPY', name: 'Yen Jepang' },
    { code: 'GBP', name: 'Pound Inggris' },
    { code: 'SGD', name: 'Dolar Singapura' },
    { code: 'AUD', name: 'Dolar Australia' },
    { code: 'MYR', name: 'Ringgit Malaysia' },
    { code: 'CNY', name: 'Yuan China' },
    { code: 'KRW', name: 'Won Korea Selatan' },
    { code: 'THB', name: 'Baht Thailand' },
    { code: 'HKD', name: 'Dolar Hong Kong' },
    { code: 'CAD', name: 'Dolar Kanada' },
    { code: 'CHF', name: 'Franc Swiss' },
    { code: 'NZD', name: 'Dolar Selandia Baru' },
    { code: 'SAR', name: 'Riyal Arab Saudi' },
    { code: 'AED', name: 'Dirham Uni Emirat Arab' },
    { code: 'PHP', name: 'Peso Filipina' },
    { code: 'VND', name: 'Dong Vietnam' },
    { code: 'INR', name: 'Rupee India' },
    { code: 'TWD', name: 'Taiwan Dolar' },
    { code: 'TRY', name: 'Lira Turki' },
    { code: 'BND', name: 'Dolar Brunei' },
];

const FOREIGN_CURRENCIES = CURRENCIES.filter(c => c.code !== 'IDR');

const App: React.FC = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    
    // Form state
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [type, setType] = useState<'Beli' | 'Jual'>('Beli');
    const [foreignCurrencyCode, setForeignCurrencyCode] = useState<string>(FOREIGN_CURRENCIES[0].code);
    const [denomination, setDenomination] = useState<string>('');
    const [notesCount, setNotesCount] = useState<string>('');
    const [exchangeRate, setExchangeRate] = useState<string>(''); // Kurs Uang Asing ke IDR
    const [notes, setNotes] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        try {
            const storedTransactions = localStorage.getItem('currencyTransactions');
            if (storedTransactions) {
                setTransactions(JSON.parse(storedTransactions));
            }
        } catch (e) {
            console.error("Gagal memuat transaksi dari localStorage:", e);
            setError("Tidak dapat memuat transaksi tersimpan.");
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('currencyTransactions', JSON.stringify(transactions));
        } catch (e) {
            console.error("Gagal menyimpan transaksi ke localStorage:", e);
            setError("Tidak dapat menyimpan transaksi. Data mungkin hilang.");
        }
    }, [transactions]);

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);

        const numDenomination = parseFloat(denomination);
        const numNotesCount = parseInt(notesCount, 10);
        const numExchangeRate = parseFloat(exchangeRate);

        if (!date || !type || !foreignCurrencyCode || isNaN(numDenomination) || isNaN(numNotesCount) || isNaN(numExchangeRate)) {
            setError('Semua kolom kecuali catatan wajib diisi dan input angka harus valid.');
            return;
        }
        if (numDenomination <= 0 || numNotesCount <= 0 || numExchangeRate <= 0) {
            setError('Nominal, Jumlah Lembar, dan Kurs harus bernilai positif.');
            return;
        }
        if (!Number.isInteger(numNotesCount)) {
            setError('Jumlah lembar harus berupa bilangan bulat.');
            return;
        }

        const totalForeignAmount = numDenomination * numNotesCount;
        const totalIdrAmount = totalForeignAmount * numExchangeRate;

        let effectiveCurrencyFrom: string;
        let effectiveAmountFrom: number;
        let effectiveCurrencyTo: string;
        let effectiveAmountTo: number;

        if (type === 'Beli') { // Beli uang asing: IDR -> ForeignCurrency
            effectiveCurrencyFrom = 'IDR';
            effectiveAmountFrom = totalIdrAmount;
            effectiveCurrencyTo = foreignCurrencyCode;
            effectiveAmountTo = totalForeignAmount;
        } else { // Jual uang asing: ForeignCurrency -> IDR
            effectiveCurrencyFrom = foreignCurrencyCode;
            effectiveAmountFrom = totalForeignAmount;
            effectiveCurrencyTo = 'IDR';
            effectiveAmountTo = totalIdrAmount;
        }

        const newTransaction: Transaction = {
            id: Date.now().toString(),
            date,
            type,
            foreignCurrencyCode,
            denomination: numDenomination,
            notesCount: numNotesCount,
            exchangeRateToIDR: numExchangeRate,
            effectiveCurrencyFrom,
            effectiveAmountFrom,
            effectiveCurrencyTo,
            effectiveAmountTo,
            notes,
        };

        setTransactions(prevTransactions => [newTransaction, ...prevTransactions]);

        // Reset form
        setDate(new Date().toISOString().split('T')[0]);
        setType('Beli');
        setForeignCurrencyCode(FOREIGN_CURRENCIES[0].code);
        setDenomination('');
        setNotesCount('');
        setExchangeRate('');
        setNotes('');
    };
    
    const handleDeleteTransaction = (id: string) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) {
            setTransactions(transactions.filter(tx => tx.id !== id));
        }
    };

    const formatNumber = (amount: number, minFractionDigits = 2, maxFractionDigits = 2) => {
        try {
            return new Intl.NumberFormat('id-ID', { 
                style: 'decimal', 
                minimumFractionDigits: minFractionDigits, 
                maximumFractionDigits: maxFractionDigits 
            }).format(amount);
        } catch (e) { 
            return amount.toFixed(maxFractionDigits);
        }
    };

    const currencyBalances = useMemo(() => {
        const balances: { [key: string]: number } = {};
        // Initialize all known currencies to ensure they exist in balances object if needed later, though filtering will hide IDR and non-positive balances.
        CURRENCIES.forEach(c => balances[c.code] = 0);

        transactions.forEach(tx => {
            // Ensure currency codes exist in balances before operation, though initialization above should cover this.
            if (balances[tx.effectiveCurrencyFrom] === undefined) balances[tx.effectiveCurrencyFrom] = 0;
            if (balances[tx.effectiveCurrencyTo] === undefined) balances[tx.effectiveCurrencyTo] = 0;
            
            balances[tx.effectiveCurrencyFrom] -= tx.effectiveAmountFrom;
            balances[tx.effectiveCurrencyTo] += tx.effectiveAmountTo;
        });
        return balances;
    }, [transactions]);

    const getCurrencyName = (code: string): string => {
        const currency = CURRENCIES.find(c => c.code === code);
        return currency ? `${currency.name} (${currency.code})` : code;
    };


    return (
        <>
            <h1>Catatan Transaksi Mata Uang Asing 💸</h1>

            {error && <p className="error-message">{error}</p>}

            <h2>Tambah Transaksi Baru</h2>
            <form onSubmit={handleSubmit} className="transaction-form" aria-labelledby="form-heading">
                <div className="form-group">
                    <label htmlFor="date">Tanggal:</label>
                    <input type="date" id="date" value={date} onChange={(e) => setDate(e.target.value)} required aria-required="true" />
                </div>

                <div className="form-group">
                    <label htmlFor="type">Jenis Transaksi:</label>
                    <select id="type" value={type} onChange={(e) => setType(e.target.value as 'Beli' | 'Jual')} required aria-required="true" >
                        <option value="Beli">Beli Uang Asing (Anda mendapatkan Uang Asing)</option>
                        <option value="Jual">Jual Uang Asing (Anda mendapatkan IDR)</option>
                    </select>
                </div>

                <div className="form-group">
                    <label htmlFor="foreignCurrencyCode">Uang Asing:</label>
                    <select id="foreignCurrencyCode" value={foreignCurrencyCode} onChange={(e) => setForeignCurrencyCode(e.target.value)} required aria-required="true" >
                        {FOREIGN_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
                    </select>
                </div>
                
                <div className="form-group">
                    <label htmlFor="denomination">Nominal Uang (per lembar):</label>
                    <input type="number" id="denomination" value={denomination} onChange={(e) => setDenomination(e.target.value)} placeholder="cth., 100" step="any" required aria-required="true" />
                </div>

                <div className="form-group">
                    <label htmlFor="notesCount">Jumlah Lembar:</label>
                    <input type="number" id="notesCount" value={notesCount} onChange={(e) => setNotesCount(e.target.value)} placeholder="cth., 5" step="1" required aria-required="true" />
                </div>

                <div className="form-group">
                    <label htmlFor="exchangeRate">Kurs (1 Uang Asing = ... IDR):</label>
                    <input type="number" id="exchangeRate" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} placeholder="cth., 15000" step="any" required aria-required="true" />
                </div>
                
                <div className="form-group full-width">
                    <label htmlFor="notes">Catatan (Opsional):</label>
                    <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="cth., Untuk perjalanan, sisa oleh-oleh" />
                </div>
                
                <button type="submit" className="full-width">Tambah Transaksi</button>
            </form>

            <h2>Ringkasan Saldo Mata Uang Asing Tersedia</h2>
            {Object.entries(currencyBalances)
                .filter(([code, balance]: [string, number]) => code !== 'IDR' && balance > 0.001) // Show only foreign currencies with positive balance (use small epsilon for float comparison)
                .length === 0 ? (
                 <p className="no-transactions">Belum ada saldo mata uang asing yang tersedia.</p>
            ) : (
                <div style={{overflowX: 'auto'}}>
                    <table className="transactions-table balance-table" aria-label="Ringkasan Saldo Mata Uang Asing">
                        <thead>
                            <tr>
                                <th scope="col">Mata Uang Asing</th>
                                <th scope="col">Saldo Tersedia</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(currencyBalances)
                                .filter(([code, balance]: [string, number]) => code !== 'IDR' && balance > 0.001) 
                                .sort(([codeA], [codeB]) => codeA.localeCompare(codeB))
                                .map(([code, balance]: [string, number]) => (
                                <tr key={code}>
                                    <td>{getCurrencyName(code)}</td>
                                    <td className={`currency-amount ${balance < 0 ? 'negative-balance' : ''}`}>{formatNumber(balance)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}


            <h2>Riwayat Transaksi</h2>
            {transactions.length === 0 ? (
                <p className="no-transactions">Belum ada transaksi yang dicatat.</p>
            ) : (
                <div style={{overflowX: 'auto'}}>
                    <table className="transactions-table" aria-label="Riwayat Transaksi">
                        <thead>
                            <tr>
                                <th scope="col">Tanggal</th>
                                <th scope="col">Jenis</th>
                                <th scope="col">Uang Asing</th>
                                <th scope="col">Nominal /Lembar</th>
                                <th scope="col">Jml Lembar</th>
                                <th scope="col">Kurs ke IDR</th>
                                <th scope="col">Total U.Asing</th>
                                <th scope="col">Total IDR</th>
                                <th scope="col">Catatan</th>
                                <th scope="col">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map(tx => {
                                const totalForeign = tx.denomination * tx.notesCount;
                                const totalIDR = totalForeign * tx.exchangeRateToIDR;
                                return (
                                <tr key={tx.id}>
                                    <td>{new Date(tx.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                                    <td>{tx.type}</td>
                                    <td>{tx.foreignCurrencyCode}</td>
                                    <td className="currency-amount">{formatNumber(tx.denomination)}</td>
                                    <td className="currency-amount">{formatNumber(tx.notesCount, 0,0)}</td>
                                    <td className="currency-amount">1 {tx.foreignCurrencyCode} = {formatNumber(tx.exchangeRateToIDR, 2, 4)} IDR</td>
                                    <td className="currency-amount">{formatNumber(totalForeign)} {tx.foreignCurrencyCode}</td>
                                    <td className="currency-amount">{formatNumber(totalIDR)} IDR</td>
                                    <td>{tx.notes || '-'}</td>
                                    <td>
                                        <button 
                                            onClick={() => handleDeleteTransaction(tx.id)}
                                            className="delete-button"
                                            aria-label={`Hapus transaksi ${tx.foreignCurrencyCode} tanggal ${tx.date}`}
                                        >
                                            Hapus
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
};

const container = document.getElementById('root');
if (container) {
    const root = ReactDOM.createRoot(container);
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
} else {
    console.error('Gagal menemukan elemen root');
}
