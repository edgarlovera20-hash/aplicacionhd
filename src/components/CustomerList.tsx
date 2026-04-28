import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, User, Phone, Mail, MapPin } from 'lucide-react';

interface Customer {
  id: number;
  nombre: string;
  telefono: string;
  correo: string;
  direccion: string;
  saldoTotal: number;
}

// Mock data
const mockCustomers: Customer[] = Array.from({ length: 50 }, (_, i) => ({
  id: i + 1,
  nombre: `Cliente ${i + 1}`,
  telefono: `555-000-${1000 + i}`,
  correo: `cliente${i + 1}@ejemplo.com`,
  direccion: `Calle ${i + 1}, Ciudad`,
  saldoTotal: Math.floor(Math.random() * 5000),
}));

export default function CustomerList() {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const totalPages = Math.ceil(mockCustomers.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCustomers = mockCustomers.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl w-full">
      <h2 className="text-xl font-bold text-white mb-6">Lista de Clientes</h2>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="text-xs uppercase bg-black/20 text-slate-400">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Teléfono</th>
              <th className="px-4 py-3">Correo</th>
              <th className="px-4 py-3">Saldo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {currentCustomers.map((customer) => (
              <tr key={customer.id} className="hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 font-medium text-white">{customer.nombre}</td>
                <td className="px-4 py-3">{customer.telefono}</td>
                <td className="px-4 py-3">{customer.correo}</td>
                <td className="px-4 py-3 text-emerald-400 font-semibold">${customer.saldoTotal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mt-6">
        <button
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="p-2 bg-slate-800 rounded-lg disabled:opacity-50 hover:bg-slate-700 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm text-slate-400">Página {currentPage} de {totalPages}</span>
        <button
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="p-2 bg-slate-800 rounded-lg disabled:opacity-50 hover:bg-slate-700 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
