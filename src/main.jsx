import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { StarknetConfig, publicProvider } from '@starknet-react/core';
import { sepolia } from '@starknet-react/chains'; // Hoặc goerli, mainnet tùy bạn deploy
import { InjectedConnector } from '@starknet-react/core';

// Các connector cho ví (Argent X, Braavos)
const connectors = [
  new InjectedConnector({ options: { id: 'argentX' } }),
  new InjectedConnector({ options: { id: 'braavos' } }),
];

// Chọn mạng (phải khớp với mạng bạn đã deploy contract)
const chains = [sepolia]; // Hoặc [goerli]

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <StarknetConfig
      chains={chains}
      provider={publicProvider()} // Hoặc jsonRpcProvider nếu bạn có RPC URL riêng
      connectors={connectors}
      autoConnect // Tự động kết nối lại nếu đã từng kết nối
    >
      <App />
    </StarknetConfig>
  </React.StrictMode>
);