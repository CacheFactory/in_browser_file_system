import React, { useState } from 'react';
import './App.css';
import { FileSystem } from './lib/FileSystem';

interface AppState {
  command: string;
  results: string[];
}

function App() {
  const [fs] = useState(new FileSystem());
  const [command, setCommand] = useState('');
  const [results, setResults] = useState<AppState['results']>([]); 

  const handleKeyDown = (e: React.KeyboardEvent) =>{
    if( e.key === 'Enter' ){
      results.unshift(command + " : " +fs.executeCommand(command));
      setResults(results);

      setCommand('');  
    }
  }


  return (
    <div className="app">
        <div className="terminal" > 
          { results.map( (result, index) => { 
            
            return <div key={index}>{result.toString()}</div>
          }) }
        </div>
        <hr/>
        Enter command: 
        <input 
          type="text" 
          value={command} onChange={(e) => setCommand(e.target.value)} 
          onKeyDown={handleKeyDown} 
          className='input'
          />
        <h3>Available commands</h3>
        { fs.availableCommands().map( (command, index) => { 
            
            return <div key={index+":c"}>{command}</div>
          }) }
        <h3>Example commands</h3>
        <div>mkdir folder</div>
        <div>cd folder</div>
        <div>pwdPath</div>
        <div>createFile text.txt TEXT</div>
        <div>cat text.txt</div>
        <div>mv text.txt /</div>
        <div>cd /</div>
        <div>ls</div>



      
    </div>
  );
}

export default App;
