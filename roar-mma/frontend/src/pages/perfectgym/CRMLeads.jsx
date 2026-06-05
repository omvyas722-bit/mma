import { useState } from 'react';

const STAGES = ['New', 'Contacted', 'Trial Booked', 'Converted', 'Lost'];
const SOURCE_TAGS = ['Walk-in', 'Web Form', 'Referral', 'Social Media', 'Phone'];

const INITIAL_LEADS = [
  { id: 1, name: 'James Wilson', source: 'Walk-in', daysInStage: 1, stage: 'New', phone: '0401 234 567' },
  { id: 2, name: 'Emily Davis', source: 'Web Form', daysInStage: 3, stage: 'New', phone: '0402 345 678' },
  { id: 3, name: 'Tom Harrison', source: 'Referral', daysInStage: 5, stage: 'Contacted', phone: '0403 456 789' },
  { id: 4, name: 'Lisa Chang', source: 'Social Media', daysInStage: 2, stage: 'Contacted', phone: '0404 567 890' },
  { id: 5, name: 'Ryan Cooper', source: 'Walk-in', daysInStage: 7, stage: 'Trial Booked', phone: '0405 678 901' },
  { id: 6, name: 'Natalie Pierce', source: 'Phone', daysInStage: 1, stage: 'Trial Booked', phone: '0406 789 012' },
  { id: 7, name: 'Daniel Kim', source: 'Web Form', daysInStage: 14, stage: 'Converted', phone: '0407 890 123' },
  { id: 8, name: 'Rachel Green', source: 'Referral', daysInStage: 0, stage: 'Converted', phone: '0408 901 234' },
  { id: 9, name: 'Mark Spencer', source: 'Walk-in', daysInStage: 21, stage: 'Lost', phone: '0409 012 345' },
  { id: 10, name: 'Anna White', source: 'Social Media', daysInStage: 3, stage: 'Lost', phone: '0410 123 456' },
];

export default function CRMLeads() {
  const [leads] = useState(INITIAL_LEADS);
  const [dragOver, setDragOver] = useState(null);

  const getStageLeads = (stage) => leads.filter(l => l.stage === stage);

  const sourceColor = (source) => {
    const colors = {
      'Walk-in': 'badge-blue',
      'Web Form': 'badge-green',
      'Referral': 'badge-yellow',
      'Social Media': 'badge-red',
      'Phone': 'badge-gray',
    };
    return colors[source] || 'badge-gray';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CRM & Lead Management</h1>
          <p className="text-sm text-gray-500">Kanban pipeline — drag leads through stages</p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3 overflow-x-auto pb-4" style={{ minWidth: 0 }}>
        {STAGES.map(stage => (
          <div key={stage}
            className={`bg-gray-50 rounded-lg p-3 min-w-[200px] ${dragOver === stage ? 'ring-2 ring-red-400' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(stage); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={() => setDragOver(null)}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase">{stage}</h3>
              <span className="badge badge-gray">{getStageLeads(stage).length}</span>
            </div>
            <div className="space-y-2">
              {getStageLeads(stage).map(lead => (
                <div key={lead.id} draggable
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                >
                  <p className="text-sm font-semibold text-gray-900 mb-1">{lead.name}</p>
                  <div className="flex items-center gap-1 mb-2">
                    <span className={`badge ${sourceColor(lead.source)}`}>{lead.source}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{lead.phone}</span>
                    <span>{lead.daysInStage}d in stage</span>
                  </div>
                </div>
              ))}
              {getStageLeads(stage).length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">No leads</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
