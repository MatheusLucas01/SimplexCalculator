// src/App.jsx
import React, { useState } from 'react';
// A LINHA CORRIGIDA: Importando diretamente o solver JS puro
// CERTO ✅
import Solver from 'javascript-lp-solver';


// Ícones (sem alteração)
const TrophyIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-amber-500" viewBox="0 0 20 20" fill="currentColor"> <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /> <path fillRule="evenodd" d="M4 5a2 2 0 012-2h8a2 2 0 012 2v2a1 1 0 01-1 1h-2.155a4.002 4.002 0 00-3.69 0H5a1 1 0 01-1-1V5zm2 4a1 1 0 00-1 1v6a1 1 0 001 1h8a1 1 0 001-1v-6a1 1 0 00-1-1H6z" clipRule="evenodd" /> </svg>);

const SimplexCalculator = () => {
  // Estado para controlar a UI de definição do problema
  const [numVariables, setNumVariables] = useState(2);
  const [numConstraints, setNumConstraints] = useState(2);

  // Estado para o modelo do problema (função objetivo e restrições)
  const [model, setModel] = useState(null);
  const [solution, setSolution] = useState(null);
  const [error, setError] = useState('');

  // Função para gerar o template do modelo com base nas entradas do usuário
  const generateModel = () => {
    const vars = parseInt(numVariables, 10);
    const consts = parseInt(numConstraints, 10);

    if (isNaN(vars) || isNaN(consts) || vars < 1 || consts < 1) {
      setError("O número de variáveis e restrições deve ser no mínimo 1.");
      return;
    }
    setError('');
    setSolution(null);
    setModel({
      type: 'maximize',
      objective: Array(vars).fill(0),
      constraints: Array(consts).fill({
        coeffs: Array(vars).fill(0),
        operator: '<=',
        rhs: 0
      })
    });
  };

  // Funções para atualizar o modelo em tempo real
  const handleObjectiveChange = (index, value) => {
    const newObjective = [...model.objective];
    newObjective[index] = parseFloat(value) || 0;
    setModel({ ...model, objective: newObjective });
  };

  const handleConstraintChange = (cIndex, field, value, coeffIndex = null) => {
    const newConstraints = [...model.constraints];
    if (field === 'coeffs') {
      newConstraints[cIndex].coeffs[coeffIndex] = parseFloat(value) || 0;
    } else {
      newConstraints[cIndex][field] = field === 'rhs' ? parseFloat(value) || 0 : value;
    }
    setModel({ ...model, constraints: newConstraints });
  };

  // LÓGICA DE RESOLUÇÃO COM O MÉTODO SIMPLEX (sem alteração)
  const solveWithSimplex = () => {
    setError('');
    setSolution(null);

    // Transforma nosso estado do React para o formato da biblioteca
    const lpModelForSolver = {
      optimize: "z", // Nome da função objetivo
      opType: model.type, // 'maximize' ou 'minimize'
      constraints: {},
      variables: {},
    };

    // Constrói as variáveis
    model.objective.forEach((coeff, i) => {
      lpModelForSolver.variables[`x${i + 1}`] = { z: coeff }; // Associa coeficiente da FO
    });

    // Constrói as restrições
    model.constraints.forEach((c, index) => {
      const constraintName = `c${index}`;

      // Mapeia o operador para o formato da biblioteca
      const operatorMap = { '<=': 'max', '>=': 'min', '=': 'equal' };
      const constraintBound = operatorMap[c.operator];

      lpModelForSolver.constraints[constraintName] = { [constraintBound]: c.rhs };

      // Adiciona os coeficientes de cada variável para esta restrição
      c.coeffs.forEach((coeff, i) => {
        if (lpModelForSolver.variables[`x${i + 1}`]) {
          lpModelForSolver.variables[`x${i + 1}`][constraintName] = coeff;
        }
      });
    });

    // Chama o solver!
    const results = solver.Solve(lpModelForSolver);

    // Interpreta os resultados
    if (results.feasible) {
      const sol = {
        isFeasible: true,
        isBounded: !results.bounded,
        z: results.result,
        variables: {}
      };
      for (let i = 0; i < numVariables; i++) {
        const varName = `x${i + 1}`;
        sol.variables[varName] = results[varName] || 0;
      }
      setSolution(sol);
    } else {
      if (results.bounded === false) {
        setError("O problema tem uma solução ilimitada (unbounded).");
      } else {
        setError("O problema não tem uma solução viável (infeasible).");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent pb-2">Calculadora Simplex</h1>
          <p className="text-lg text-gray-500 mt-2">Resolva problemas de programação linear com *N* variáveis.</p>
        </header>

        {/* Etapa de Configuração */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Definição do Problema</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Número de Variáveis</label>
              <input type="number" value={numVariables} onChange={(e) => setNumVariables(e.target.value)} min="1" className="p-2 border rounded-lg w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Número de Restrições</label>
              <input type="number" value={numConstraints} onChange={(e) => setNumConstraints(e.target.value)} min="1" className="p-2 border rounded-lg w-full" />
            </div>
            <button onClick={generateModel} className="self-end w-full bg-indigo-600 text-white font-bold py-2 rounded-lg hover:bg-indigo-700 transition">
              Gerar Modelo
            </button>
          </div>
        </div>

        {error && <div className="bg-red-100 border border-red-200 text-red-800 p-4 rounded-xl shadow-md mb-8">{error}</div>}

        {model && (
          <div className="space-y-6">
            {/* Inputs do Modelo */}
            <div className="bg-white p-6 rounded-xl shadow-md border">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Função Objetivo (Z)</h3>
              <div className="flex items-center gap-4 flex-wrap">
                <select value={model.type} onChange={e => setModel({ ...model, type: e.target.value })} className="p-2 border rounded-lg bg-gray-50">
                  <option value="maximize">Maximizar</option>
                  <option value="minimize">Minimizar</option>
                </select>
                {model.objective.map((coeff, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="number" value={coeff} onChange={e => handleObjectiveChange(i, e.target.value)} className="p-2 border rounded-lg w-20 text-center" />
                    <span className="font-medium text-gray-600">X<sub>{i + 1}</sub> {i < model.objective.length - 1 && '+'}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md border">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Restrições</h3>
              <div className="space-y-4 overflow-x-auto">
                {model.constraints.map((c, cIndex) => (
                  <div key={cIndex} className="flex items-center gap-2 flex-nowrap bg-gray-50 p-3 rounded-lg min-w-max">
                    {c.coeffs.map((coeff, coeffIndex) => (
                      <div key={coeffIndex} className="flex items-center gap-2">
                        <input type="number" value={coeff} onChange={e => handleConstraintChange(cIndex, 'coeffs', e.target.value, coeffIndex)} className="p-2 border rounded-lg w-20 text-center" />
                        <span className="font-medium text-gray-600">X<sub>{coeffIndex + 1}</sub> {coeffIndex < c.coeffs.length - 1 && '+'}</span>
                      </div>
                    ))}
                    <select value={c.operator} onChange={e => handleConstraintChange(cIndex, 'operator', e.target.value)} className="p-2 border rounded-lg bg-white"><option value="<=">≤</option><option value=">=">≥</option><option value="=">=</option></select>
                    <input type="number" value={c.rhs} onChange={e => handleConstraintChange(cIndex, 'rhs', e.target.value)} className="p-2 border rounded-lg w-24 text-center" />
                  </div>
                ))}
              </div>
            </div>

            <button onClick={solveWithSimplex} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition shadow-lg">Resolver com Simplex</button>
          </div>
        )}

        {solution && solution.isFeasible && (
          <div className="mt-8 bg-gradient-to-br from-green-50 to-emerald-100 p-6 rounded-xl shadow-lg border border-green-200">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0"><TrophyIcon /></div>
              <div>
                <h2 className="text-lg font-semibold text-green-800">Solução Ótima Encontrada</h2>
                <p className="text-3xl font-bold text-green-900">Z = {solution.z.toFixed(4)}</p>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {Object.entries(solution.variables).map(([key, value]) => (
                    <span key={key} className="text-md text-gray-800 font-mono bg-green-200/50 px-2 py-1 rounded-md text-center">
                      {key} = {value.toFixed(4)}
                    </span>
                  ))}
                </div>
                {!solution.isBounded && <p className="text-yellow-600 font-bold mt-2">Atenção: A solução é ilimitada (unbounded).</p>}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};


function App() {
  return (<div className="App"><SimplexCalculator /></div>);
}

export default App;