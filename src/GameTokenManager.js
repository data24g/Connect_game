// src/SmartContractManagerV3.js
import React, { useState, useEffect } from 'react';
import {
    useAccount,
    useConnect,
    useDisconnect,
    useContractRead,
    useContractWrite,
    useWaitForTransaction,
} from '@starknet-react/core';
import smartContractV3Abi from './smartContractV3Abi.json'; // Import ABI mới
// Thư viện ethers không còn quá cần thiết cho việc format/parse units vì không có decimals
// nhưng vẫn có thể hữu ích cho việc xử lý BigInt nếu cần

// THAY THẾ BẰNG ĐỊA CHỈ CONTRACT "Smartcontract" CỦA BẠN TRÊN SEPOLIA
const MY_SMART_CONTRACT_ADDRESS = '0x...your_smartcontract_address_from_github_repo';

function WalletConnectorV3() { // Có thể giữ nguyên WalletConnector từ V2
    const { address, status } = useAccount();
    const { connect, connectors, error: connectError, isLoading: isConnecting } = useConnect();
    const { disconnect } = useDisconnect();

    if (status === 'connected') {
        return (
            <div>
                <p>Connected: {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'N/A'}</p>
                <button onClick={() => disconnect()}>Disconnect Wallet</button>
            </div>
        );
    }
    return (
        <div>
            {connectors.map((connector) => (
                <button
                    key={connector.id}
                    onClick={() => connect({ connector })}
                    disabled={isConnecting}
                >
                    {isConnecting ? 'Connecting...' : `Connect ${connector.name}`}
                </button>
            ))}
            {connectError && <p style={{ color: 'red' }}>Error connecting: {connectError.message}</p>}
        </div>
    );
}

function SmartContractManagerV3() {
    const { address, status } = useAccount();
    const [recipientAddress, setRecipientAddress] = useState('');
    const [transferAmount, setTransferAmount] = useState('');
    const [increaseAmount, setIncreaseAmount] = useState(''); // Cho hàm increase_value
    const [lastTxHash, setLastTxHash] = useState('');

    // --- Đọc giá trị (value) của người dùng ---
    const { data: userValue, isLoading: isLoadingValue, error: valueError, refetch: refetchUserValue } = useContractRead({
        functionName: 'get_value',
        abi: smartContractV3Abi,
        address: MY_SMART_CONTRACT_ADDRESS,
        // `get_value` trong contract này không nhận đối số và trả về value của caller
        // nên chúng ta không cần truyền `args: [address]`
        // Tuy nhiên, để đảm bảo nó chỉ được gọi khi đã kết nối và lấy value của người dùng hiện tại:
        enabled: !!address, // Chỉ kích hoạt hook khi có địa chỉ
        watch: true,
    });

    // Giá trị userValue trả về là u128 (BigInt), không cần format phức tạp vì không có decimals
    const formattedUserValue = userValue !== undefined ? userValue.toString() : '0';

    // --- Chuẩn bị và thực hiện các giao dịch (transfer_value, increase_value) ---
    // Sử dụng một useContractWrite và truyền `calls` động
    const { writeAsync, data: writeData, error: writeError, isLoading: isSubmitting } = useContractWrite({
        // `calls` sẽ được cập nhật động
    });

    // --- Theo dõi giao dịch ---
    const { data: txReceipt, isLoading: isTxLoading, error: txError } = useWaitForTransaction({
        hash: lastTxHash,
        watch: true,
    });

    const handleTransferValue = async () => {
        if (!recipientAddress || !transferAmount || isNaN(parseInt(transferAmount))) {
            alert("Please enter a valid recipient address and a numeric amount.");
            return;
        }
        if (BigInt(transferAmount) <= 0) {
            alert("Amount must be greater than 0.");
            return;
        }

        try {
            // `amount` là u128, starknet.js sẽ tự xử lý khi truyền string số hoặc BigInt
            const calldata = [recipientAddress, transferAmount]; // transferAmount là string

            const result = await writeAsync({
                calls: [{
                    contractAddress: MY_SMART_CONTRACT_ADDRESS,
                    entrypoint: 'transfer_value',
                    calldata: calldata,
                }]
            });
            setLastTxHash(result.transaction_hash);
            console.log("Transfer Value transaction sent:", result.transaction_hash);
            setRecipientAddress('');
            setTransferAmount('');
        } catch (e) {
            console.error("Error sending Transfer Value:", e);
            alert(`Error: ${e.message}`);
        }
    };

    const handleIncreaseValue = async () => {
        if (!increaseAmount || isNaN(parseInt(increaseAmount))) {
            alert("Please enter a numeric amount to increase.");
            return;
        }
        if (BigInt(increaseAmount) <= 0) {
            alert("Amount must be greater than 0.");
            return;
        }

        try {
            const calldata = [increaseAmount]; // increaseAmount là string

            const result = await writeAsync({
                calls: [{
                    contractAddress: MY_SMART_CONTRACT_ADDRESS,
                    entrypoint: 'increase_value',
                    calldata: calldata,
                }]
            });
            setLastTxHash(result.transaction_hash);
            console.log("Increase Value transaction sent:", result.transaction_hash);
            setIncreaseAmount('');
        } catch (e) {
            console.error("Error sending Increase Value:", e);
            alert(`Error: ${e.message}`);
        }
    };

    // Cập nhật giá trị sau khi giao dịch thành công
    useEffect(() => {
        if (txReceipt) {
            console.log("Transaction receipt:", txReceipt);
            if (txReceipt.execution_status === 'SUCCEEDED') {
                alert("Transaction successful!");
                refetchUserValue(); // Lấy lại giá trị mới
            } else {
                alert(`Transaction ${txReceipt.execution_status}: ${txReceipt.revert_reason || 'Failed'}`);
            }
            setLastTxHash('');
        }
    }, [txReceipt, refetchUserValue]);

    if (status === 'disconnected') {
        return (
            <div>
                <h2>Game Value Manager (V3)</h2>
                <WalletConnectorV3 />
                <p>Please connect your wallet to manage your game value.</p>
            </div>
        );
    }
    if (status === 'connecting') {
        return <p>Connecting to wallet...</p>
    }

    return (
        <div>
            <h2>Game Value Manager (V3)</h2>
            <WalletConnectorV3 />

            <h3>Your Current Value</h3>
            {isLoadingValue ? (
                <p>Loading your value...</p>
            ) : (
                <p>{formattedUserValue} units</p>
            )}
            {valueError && <p style={{ color: 'red' }}>Error loading value: {valueError.message}</p>}

            <hr />

            <h3>Increase Your Value</h3>
            <div>
                <input
                    type="number"
                    placeholder="Amount to increase"
                    value={increaseAmount}
                    onChange={(e) => setIncreaseAmount(e.target.value)}
                    style={{ marginRight: '10px' }}
                />
                <button onClick={handleIncreaseValue} disabled={isSubmitting || isTxLoading || !address}>
                    {isSubmitting ? 'Submitting...' : (isTxLoading ? 'Processing Tx...' : 'Increase Value')}
                </button>
            </div>

            <hr />

            <h3>Transfer Value to Another Address</h3>
            <div>
                <input
                    type="text"
                    placeholder="Recipient Address (0x...)"
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    style={{ width: '300px', marginRight: '10px', marginBottom: '5px' }}
                />
            </div>
            <div>
                <input
                    type="number"
                    placeholder="Amount to transfer"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    style={{ marginRight: '10px' }}
                />
            </div>
            <button onClick={handleTransferValue} disabled={isSubmitting || isTxLoading || !address}>
                {isSubmitting ? 'Submitting...' : (isTxLoading ? 'Processing Tx...' : 'Transfer Value')}
            </button>

            {/* Hiển thị lỗi và trạng thái giao dịch */}
            {writeError && <p style={{ color: 'red' }}>Transaction Error: {writeError.message}</p>}
            {txError && <p style={{ color: 'red' }}>Network Transaction Error: {txError.message}</p>}
            {lastTxHash && !isTxLoading && <p>Last Tx Hash: {lastTxHash.slice(0, 10)}... (Status: {txReceipt?.execution_status || 'Pending'})</p>}
        </div>
    );
}

export default SmartContractManagerV3;