// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title RiskRegistry
/// @author XRadar
/// @notice On-chain registry of the latest risk score for each token on X Layer.
/// @dev Only accounts with {ORACLE_ROLE} may publish. Role administration is
///      restricted to {DEFAULT_ADMIN_ROLE}. Each token keeps a single latest
///      entry; republishing overwrites score, report URI, and timestamp.
contract RiskRegistry is AccessControl {
    /// @notice Role allowed to call {publishScore}.
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    /// @notice Latest published score for a token.
    /// @param score Risk score in the inclusive range `[0, 100]`.
    /// @param reportURI Off-chain URI of the full risk report.
    /// @param timestamp Block timestamp of the last successful publish.
    struct ScoreEntry {
        uint8 score;
        string reportURI;
        uint256 timestamp;
    }

    /// @notice Emitted when a token's latest score is written or overwritten.
    /// @param token Token whose score was updated.
    /// @param score New score in `[0, 100]`.
    /// @param reportURI New report URI.
    /// @param timestamp Block timestamp of this update.
    event ScoreUpdated(
        address indexed token,
        uint8 score,
        string reportURI,
        uint256 timestamp
    );

    /// @notice The supplied score is greater than 100.
    /// @param score The rejected score.
    error InvalidScore(uint8 score);

    /// @notice A required address argument was the zero address.
    error ZeroAddress();

    /// @dev Latest score keyed by token address.
    mapping(address token => ScoreEntry entry) private _latest;

    /// @dev Insertion-ordered list of every token that has been scored at least once.
    address[] private _scannedTokens;

    /// @dev Tracks membership in {_scannedTokens} so republishes do not duplicate.
    mapping(address token => bool seen) private _scanned;

    /// @notice Deploys the registry and grants admin to `admin`.
    /// @dev Does not grant {ORACLE_ROLE}. The admin must call {grantOracleRole}.
    /// @param admin Account that receives {DEFAULT_ADMIN_ROLE}.
    constructor(address admin) {
        if (admin == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /// @notice Publish or overwrite the latest risk score for `token`.
    /// @dev Reverts if `score` is greater than 100. First-time tokens are
    ///      appended to the scanned-token list; later publishes only overwrite
    ///      the stored entry.
    /// @param token Token address being scored.
    /// @param score Risk score in `[0, 100]`.
    /// @param reportURI URI of the off-chain report (IPFS, HTTPS, etc.).
    function publishScore(address token, uint8 score, string calldata reportURI)
        external
        onlyRole(ORACLE_ROLE)
    {
        if (token == address(0)) revert ZeroAddress();
        if (score > 100) revert InvalidScore(score);

        _latest[token] = ScoreEntry({
            score: score,
            reportURI: reportURI,
            timestamp: block.timestamp
        });

        if (!_scanned[token]) {
            _scanned[token] = true;
            _scannedTokens.push(token);
        }

        emit ScoreUpdated(token, score, reportURI, block.timestamp);
    }

    /// @notice Return the latest published score for `token`.
    /// @dev Unscored tokens return `(0, "", 0)`.
    /// @param token Token to look up.
    /// @return score Latest score, or `0` if never scored.
    /// @return reportURI Latest report URI, or empty if never scored.
    /// @return timestamp Latest publish timestamp, or `0` if never scored.
    function getLatestScore(address token)
        external
        view
        returns (uint8 score, string memory reportURI, uint256 timestamp)
    {
        ScoreEntry storage entry = _latest[token];
        return (entry.score, entry.reportURI, entry.timestamp);
    }

    /// @notice Return every token address that has been scored at least once.
    /// @dev Order is first-seen. Republishes do not add duplicates.
    /// @return tokens Insertion-ordered unique token addresses.
    function getAllScannedTokens() external view returns (address[] memory tokens) {
        return _scannedTokens;
    }

    /// @notice Grant {ORACLE_ROLE} to `account`.
    /// @dev Restricted to {DEFAULT_ADMIN_ROLE}.
    /// @param account Address that may call {publishScore}.
    function grantOracleRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (account == address(0)) revert ZeroAddress();
        _grantRole(ORACLE_ROLE, account);
    }

    /// @notice Revoke {ORACLE_ROLE} from `account`.
    /// @dev Restricted to {DEFAULT_ADMIN_ROLE}.
    /// @param account Address that should no longer call {publishScore}.
    function revokeOracleRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(ORACLE_ROLE, account);
    }
}
