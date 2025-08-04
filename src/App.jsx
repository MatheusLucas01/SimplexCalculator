import React, { useState } from 'react';

// Ícone de troféu
const TrophyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
    <path fillRule="evenodd" d="M4 5a2 2 0 012-2h8a2 2 0 012 2v2a1 1 0 01-1 1h-2.155a4.002 4.002 0 00-3.69 0H5a1 1 0 01-1-1V5zm2 4a1 1 0 00-1 1v6a1 1 0 001 1h8a1 1 0 001-1v-6a1 1 0 00-1-1H6z" clipRule="evenodd" />
  </svg>
);

const SimplexCalculator = () => {
  // Estados da aplicação
  const [numVariables, setNumVariables] = useState(2);
  const [numConstraints, setNumConstraints] = useState(2);
  const [model, setModel] = useState(null);
  const [solution, setSolution] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState('unknown'); // 'online', 'offline', 'unknown'

  // Configuração da API
  const API_BASE_URL = 'https://simplexcalculator-backend.onrender.com/api';

  // Verificar status do servidor Python
  const checkServerStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (response.ok) {
        setServerStatus('online');
        setError('');
        return true;
      } else {
        setServerStatus('offline');
        return false;
      }
    } catch (error) {
      setServerStatus('offline');
      setError('Servidor Python não está respondendo. Certifique-se de que está rodando na porta 5000.');
      return false;
    }
  };

  // Gerar template do modelo
  const generateModel = () => {
    const vars = parseInt(numVariables, 10);
    const consts = parseInt(numConstraints, 10);

    if (isNaN(vars) || isNaN(consts) || vars < 1 || consts < 1) {
      setError("O número de variáveis e restrições deve ser no mínimo 1.");
      return;
    }

    if (vars !== 2) {
      setError("Esta versão suporta apenas problemas com 2 variáveis (para visualização gráfica).");
      return;
    }

    setError('');
    setSolution(null);
    setModel({
      type: 'maximize',
      objective: Array(vars).fill(0),
      constraints: Array(consts).fill(null).map(() => ({
        coeffs: Array(vars).fill(0),
        operator: '<=',
        rhs: 0
      }))
    });
  };

  // Atualizar função objetivo
  const handleObjectiveChange = (index, value) => {
    const newObjective = [...model.objective];
    newObjective[index] = parseFloat(value) || 0;
    setModel({ ...model, objective: newObjective });
  };

  // Atualizar restrições
  const handleConstraintChange = (cIndex, field, value, coeffIndex = null) => {
    const newConstraints = [...model.constraints];
    if (field === 'coeffs') {
      const newCoeffs = [...newConstraints[cIndex].coeffs];
      newCoeffs[coeffIndex] = parseFloat(value) || 0;
      newConstraints[cIndex] = { ...newConstraints[cIndex], coeffs: newCoeffs };
    } else {
      newConstraints[cIndex] = {
        ...newConstraints[cIndex],
        [field]: field === 'rhs' ? parseFloat(value) || 0 : value
      };
    }
    setModel({ ...model, constraints: newConstraints });
  };

  // Resolver problema via API Python
  const solveWithPython = async () => {
    if (!model) {
      setError("Primeiro gere o modelo.");
      return;
    }

    // Verificar se o servidor está online
    const isServerOnline = await checkServerStatus();
    if (!isServerOnline) {
      return;
    }

    setLoading(true);
    setError('');
    setSolution(null);

    try {
      // Preparar dados para enviar ao backend
      const requestData = {
        objective: model.objective,
        constraints: model.constraints.map(c => c.coeffs),
        bounds: model.constraints.map(c => c.rhs),
        type: model.type
      };

      // Fazer requisição para o backend Python
      const response = await fetch(`${API_BASE_URL}/solve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setSolution(result);
        setError('');
      } else {
        setError(result.error || 'Erro desconhecido no backend');
        setSolution(null);
      }

    } catch (error) {
      setError(`Erro ao comunicar com o servidor Python: ${error.message}`);
      setSolution(null);
      setServerStatus('offline');
    } finally {
      setLoading(false);
    }
  };

  // Carregar exemplos
  const loadExample = async (exampleType) => {
    try {
      const response = await fetch(`${API_BASE_URL}/examples`);
      const data = await response.json();

      if (data.success && data.examples[exampleType]) {
        const example = data.examples[exampleType];

        setNumVariables(2);
        setNumConstraints(example.constraints.length);

        setModel({
          type: example.type,
          objective: example.objective,
          constraints: example.constraints.map((constraint, index) => ({
            coeffs: constraint,
            operator: '<=',
            rhs: example.bounds[index]
          }))
        });

        setError('');
        setSolution(null);
      } else {
        setError('Exemplo não encontrado');
      }
    } catch (error) {
      setError('Erro ao carregar exemplo: ' + error.message);
    }
  };

  // Limpar tudo
  const clearAll = () => {
    setNumVariables(2);
    setNumConstraints(2);
    setModel(null);
    setSolution(null);
    setError('');
  };

  // Verificar status do servidor na inicialização
  React.useEffect(() => {
    checkServerStatus();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Calculadora Simplex Professional
          </h1>
          <p className="text-gray-600">Frontend React + Backend Python com Matplotlib</p>

          {/* Status do servidor */}
          <div className="mt-4 flex justify-center">
            <div className={`px-4 py-2 rounded-full text-sm font-medium ${serverStatus === 'online' ? 'bg-green-100 text-green-800' :
              serverStatus === 'offline' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
              🐍 Backend Python: {
                serverStatus === 'online' ? 'Online ✅' :
                  serverStatus === 'offline' ? 'Offline ❌' :
                    'Verificando...'
              }
              <button
                onClick={checkServerStatus}
                className="ml-2 text-xs underline hover:no-underline"
              >
                ↻ Verificar
              </button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Coluna da Esquerda - Configuração */}
          <div className="space-y-6">
            {/* Definição do Problema */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Definição do Problema</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Número de Variáveis</label>
                  <input
                    type="number"
                    value={numVariables}
                    onChange={(e) => setNumVariables(e.target.value)}
                    min="2"
                    max="2"
                    className="p-2 border rounded-lg w-full"
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">Fixo em 2 para visualização gráfica</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Número de Restrições</label>
                  <input
                    type="number"
                    value={numConstraints}
                    onChange={(e) => setNumConstraints(e.target.value)}
                    min="1"
                    max="5"
                    className="p-2 border rounded-lg w-full"
                  />
                </div>
                <button
                  onClick={generateModel}
                  className="self-end w-full bg-indigo-600 text-white font-bold py-2 rounded-lg hover:bg-indigo-700 transition"
                >
                  Gerar Modelo
                </button>
              </div>

              {/* Exemplos rápidos */}
              <div className="mt-4 flex gap-2 flex-wrap">
                <button
                  onClick={() => loadExample('lucro')}
                  className="bg-green-100 hover:bg-green-200 text-green-800 px-3 py-1 rounded-lg text-sm transition"
                >
                  📈 Exemplo: Maximizar Lucro
                </button>
                <button
                  onClick={() => loadExample('producao')}
                  className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded-lg text-sm transition"
                >
                  🏭 Exemplo: Mix de Produção
                </button>
                <button
                  onClick={clearAll}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-lg text-sm transition"
                >
                  🗑️ Limpar Tudo
                </button>
              </div>
            </div>

            {/* Função Objetivo */}
            {model && (
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-lg font-semibold text-blue-700 mb-4">Função Objetivo (Z)</h3>
                <div className="flex items-center gap-4 flex-wrap">
                  <select
                    value={model.type}
                    onChange={e => setModel({ ...model, type: e.target.value })}
                    className="p-2 border rounded-lg bg-gray-50"
                  >
                    <option value="maximize">Maximizar</option>
                    <option value="minimize">Minimizar</option>
                  </select>
                  {model.objective.map((coeff, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="number"
                        value={coeff}
                        onChange={e => handleObjectiveChange(i, e.target.value)}
                        className="p-2 border rounded-lg w-20 text-center"
                        step="0.1"
                      />
                      <span className="font-medium text-gray-600">
                        X<sub>{i + 1}</sub> {i < model.objective.length - 1 && '+'}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-center font-mono text-lg bg-gray-100 p-3 rounded-lg">
                  {model.type === 'maximize' ? 'MAXIMIZAR' : 'MINIMIZAR'} Z = {model.objective[0]}X₁ + {model.objective[1]}X₂
                </div>
              </div>
            )}

            {/* Restrições */}
            {model && (
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-lg font-semibold text-green-700 mb-4">Restrições</h3>
                <div className="space-y-4">
                  {model.constraints.map((c, cIndex) => (
                    <div key={cIndex} className="flex items-center gap-2 flex-wrap bg-gray-50 p-3 rounded-lg">
                      {c.coeffs.map((coeff, coeffIndex) => (
                        <div key={coeffIndex} className="flex items-center gap-2">
                          <input
                            type="number"
                            value={coeff}
                            onChange={e => handleConstraintChange(cIndex, 'coeffs', e.target.value, coeffIndex)}
                            className="p-2 border rounded-lg w-20 text-center"
                            step="0.1"
                          />
                          <span className="font-medium text-gray-600">
                            X<sub>{coeffIndex + 1}</sub> {coeffIndex < c.coeffs.length - 1 && '+'}
                          </span>
                        </div>
                      ))}
                      <span className="font-mono text-gray-600">≤</span>
                      <input
                        type="number"
                        value={c.rhs}
                        onChange={e => handleConstraintChange(cIndex, 'rhs', e.target.value)}
                        className="p-2 border rounded-lg w-24 text-center"
                        step="0.1"
                      />
                    </div>
                  ))}
                </div>
                <div className="text-sm text-gray-500 mt-2">
                  ℹ️ Esta versão suporta apenas restrições do tipo ≤ (menor ou igual)
                </div>
              </div>
            )}

            {/* Botão Resolver */}
            {model && (
              <button
                onClick={solveWithPython}
                disabled={loading || serverStatus === 'offline'}
                className={`w-full py-4 px-6 rounded-lg transition-all duration-300 font-semibold text-lg shadow-lg ${loading || serverStatus === 'offline'
                  ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white hover:shadow-xl transform hover:-translate-y-1'
                  }`}
              >
                {loading ? '🔄 Resolvendo...' : '🚀 Resolver com Python'}
              </button>
            )}

            {/* Botão Limpar */}
            <button
              onClick={clearAll}
              className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
            >
              🗑️ Limpar Tudo
            </button>

            {/* Mensagens de Erro */}
            {error && (
              <div className="bg-red-100 border border-red-400 p-4 rounded-lg">
                <p className="text-red-700 font-medium">❌ Erro:</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
            )}
          </div>

          {/* Coluna da Direita - Resultados */}
          <div className="space-y-6">
            {solution && solution.success && (
              <>
                {/* Solução Ótima */}
                <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-yellow-500">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <TrophyIcon />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-yellow-700 mb-2">
                        Solução Ótima Encontrada
                      </h2>
                      <div className="bg-yellow-50 p-4 rounded-lg">
                        <div className="text-3xl font-bold text-yellow-800 mb-2">
                          X₁ = {solution.optimal_point.x1.toFixed(2)}, X₂ = {solution.optimal_point.x2.toFixed(2)}
                        </div>
                        <div className="text-xl text-gray-700 font-semibold">
                          Z = {solution.optimal_point.objective_value.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gráfico Python */}
                {solution.graph && (
                  <div className="bg-white p-6 rounded-lg shadow-lg">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2">
                      🐍 Gráfico Profissional (Matplotlib)
                    </h3>
                    <div className="border border-gray-200 rounded-lg p-2 bg-gray-50">
                      <img
                        src={`data:image/png;base64,${solution.graph}`}
                        alt="Gráfico Simplex Profissional"
                        className="w-full h-auto rounded"
                        style={{ maxHeight: '600px', objectFit: 'contain' }}
                      />
                    </div>
                    <div className="mt-4 bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <h4 className="font-semibold text-purple-800 mb-2">🎯 Qualidade Profissional</h4>
                      <ul className="text-sm text-purple-700 space-y-1">
                        <li>✓ <strong>Resolução HD</strong> - 300 DPI para impressão</li>
                        <li>✓ <strong>Tipografia matemática</strong> - Símbolos e fórmulas precisas</li>
                        <li>✓ <strong>Cores acadêmicas</strong> - Padrão científico</li>
                        <li>✓ <strong>Layout profissional</strong> - Ideal para relatórios</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* Análise dos Vértices */}
                {solution.vertices && (
                  <div className="bg-white p-6 rounded-lg shadow-lg">
                    <h3 className="text-lg font-semibold mb-4 text-purple-700">
                      📊 Análise dos Vértices
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="p-3 text-left font-semibold">Ponto</th>
                            <th className="p-3 text-left font-semibold">X₁</th>
                            <th className="p-3 text-left font-semibold">X₂</th>
                            <th className="p-3 text-left font-semibold">Z</th>
                            <th className="p-3 text-left font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {solution.vertices.map((vertex, index) => (
                            <tr
                              key={index}
                              className={
                                vertex.x1 === solution.optimal_point.x1 &&
                                  vertex.x2 === solution.optimal_point.x2
                                  ? 'bg-yellow-100 text-yellow-800 font-semibold'
                                  : 'hover:bg-gray-50'
                              }
                            >
                              <td className="p-3 border-b">({vertex.x1.toFixed(1)}, {vertex.x2.toFixed(1)})</td>
                              <td className="p-3 border-b">{vertex.x1.toFixed(2)}</td>
                              <td className="p-3 border-b">{vertex.x2.toFixed(2)}</td>
                              <td className="p-3 border-b">{vertex.objective_value.toFixed(2)}</td>
                              <td className="p-3 border-b">
                                {vertex.x1 === solution.optimal_point.x1 &&
                                  vertex.x2 === solution.optimal_point.x2 ? '⭐ ÓTIMO' : 'Viável'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Instruções de Instalação */}
            {serverStatus === 'offline' && (
              <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">
                  🐍 Como Iniciar o Backend Python
                </h3>
                <div className="space-y-4 text-sm">
                  <div>
                    <h4 className="font-semibold text-gray-700">1. Instalar dependências:</h4>
                    <code className="block bg-gray-100 p-2 rounded mt-1 font-mono text-xs">
                      pip install flask flask-cors matplotlib numpy
                    </code>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-700">2. Salvar código backend:</h4>
                    <p className="text-gray-600">Salve o código Python como <code>app.py</code></p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-700">3. Executar servidor:</h4>
                    <code className="block bg-gray-100 p-2 rounded mt-1 font-mono text-xs">
                      python app.py
                    </code>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 p-3 rounded">
                    <p className="text-blue-800 text-sm">
                      💡 O servidor deve estar rodando em <strong>http://localhost:5000</strong>
                      para que esta interface funcione.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimplexCalculator;