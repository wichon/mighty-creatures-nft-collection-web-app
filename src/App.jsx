import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import './styles/App.css';
import twitterLogo from './assets/twitter-logo.svg';
import myEpicNft from './utils/EpicNFT.json';
import { css } from "@emotion/react";
import HashLoader from "react-spinners/HashLoader";

// Can be a string as well. Need to ensure each key-value pair ends with ;
const override = css`
  display: block;
  margin: 0 auto;
  margin-top: 10px;
  border-color: red;
  text-align: center;
`;


// Constants
const TWITTER_HANDLE = 'wichon';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;
const OPENSEA_LINK = '';
const TOTAL_MINT_COUNT = 50;

const CONTRACT_ADDRESS = "0x161e7ADAb4FC5df1B82292B2EAD81B737f92d07E";

const App = () => {

  const [loading, setLoading] = useState(false);

  const [currentAccount, setCurrentAccount] = useState("");

  const [mintedCreaturesMsg, setMintedCreaturesMsg] = useState("");

  const [buttonClassName, setButtonClassName] = useState("cta-button connect-wallet-button")

  const [nftPreviewSrc, setNftPreviewSrc] = useState("")

  const [newMintedNftMsg, setNewMintedNftMsg] = useState("")

  const [nftPreviewClass, setNftPreviewClass] = useState("hidden")

  const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
  }

  const checkChainIsRinkeby = async() => {
    let chainId = await ethereum.request({ method: 'eth_chainId' });
    console.log("Connected to chain " + chainId);

    // String, hex code of the chainId of the Rinkebey test network
    const rinkebyChainId = "0x4"; 
    if (chainId !== rinkebyChainId) {
      return false;
    }
    console.log("Chain is Rinkeby!");
    return true;
  }

  const checkIfWalletIsConnected = async () => {
    const { ethereum } = window;

    if (!ethereum) {
        console.log("Make sure you have metamask!");
        return;
    } else {
        console.log("We have the ethereum object", ethereum);
    }

    if (!(await checkChainIsRinkeby())) {
      alert("You are not connected to the Rinkeby Test Network!");
      return;
    }

    /*
    * Check if we're authorized to access the user's wallet
    */
    const accounts = await ethereum.request({ method: 'eth_accounts' });

    /*
    * User can have multiple authorized accounts, we grab the first one if its there!
    */
    if (accounts.length !== 0) {
      const account = accounts[0];
      console.log("Found an authorized account:", account);
      setCurrentAccount(account)

      // Setup listener! This is for the case where a user comes to our site
      // and ALREADY had their wallet connected + authorized.
      setupEventListener();
      askContractForTotalMintedNfts();
    } else {
      console.log("No authorized account found")
    }
  }

  /*
  * Implement your connectWallet method here
  */
  const connectWallet = async () => {
    try {
      const { ethereum } = window;

      if (!ethereum) {
        alert("Get MetaMask!");
        return;
      }

      if (!(await checkChainIsRinkeby())) {
        alert("You are not connected to the Rinkeby Test Network!");
        return;
      }

      /*
      * Fancy method to request access to account.
      */
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });

      /*
      * Boom! This should print out public address once we authorize Metamask.
      */
      console.log("Connected", accounts[0]);
      setCurrentAccount(accounts[0]);

      // Setup listener! This is for the case where a user comes to our site
      // and connected their wallet for the first time.
      setupEventListener();
      askContractForTotalMintedNfts();
    } catch (error) {
      console.log(error)
    }
  }

  // Render Methods
  const renderNotConnectedContainer = () => (
    <button onClick={connectWallet} className="cta-button connect-wallet-button">
      Connect to Wallet
    </button>
  );

  // Setup our listener.
  const setupEventListener = async () => {
    // Most of this looks the same as our function askContractToMintNft
    try {
      const { ethereum } = window;

      if (ethereum) {
        // Same stuff again
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const connectedContract = new ethers.Contract(CONTRACT_ADDRESS, myEpicNft.abi, signer);

        // THIS IS THE MAGIC SAUCE.
        // This will essentially "capture" our event when our contract throws it.
        // If you're familiar with webhooks, it's very similar to that!
        connectedContract.on("NewEpicNFTMinted", async(from, tokenId) => {
          let nftReady = false;
          let retries = 0;
          while (!nftReady && retries < 3) {
            await sleep(4000 + (retries * 1000));

            fetch(`https://testnets-api.opensea.io/api/v1/asset/${CONTRACT_ADDRESS}/${tokenId.toNumber()}/`)
              .then( response => {
                if (response.ok) {
                  return response.json();
                }
                throw response;
              })
              .then( data => {
                console.log(data)
                setNftPreviewSrc(data.image_thumbnail_url);
                setNewMintedNftMsg(`Minted: ${data.name}`);
                setNftPreviewClass("mintedNftThumbnail");
                nftReady = true;
              })
              .catch( error => {
                console.error("Oops, error fetching NFT data from OpenSea API, retrying ...");
              });

              setLoading(false);
              setButtonClassName("cta-button connect-wallet-button");
              retries += 1;
          }

        });

        console.log("Setup event listener!")

      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log(error)
    }
  }

  const askContractToMintNft = async () => {

    try {
      const { ethereum } = window;

      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const connectedContract = new ethers.Contract(CONTRACT_ADDRESS, myEpicNft.abi, signer);

        console.log("Going to pop wallet now to pay gas...")
        let nftTxn = await connectedContract.makeAnEpicNFT();

        setLoading(true);
        setButtonClassName("hidden");

        console.log("Mining...please wait.")
        await nftTxn.wait();
        
        console.log(`Mined, see transaction: https://rinkeby.etherscan.io/tx/${nftTxn.hash}`);

        askContractForTotalMintedNfts();

      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log(error)
    }
  }

  const askContractForTotalMintedNfts = async () => {

    try {
      const { ethereum } = window;

      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const connectedContract = new ethers.Contract(CONTRACT_ADDRESS, myEpicNft.abi, signer);

        console.log("Going to pop wallet now to pay gas...")
        let mintedNfts = await connectedContract.getNumberOfMintedNFTs();
        let numMintedNfts = mintedNfts.toNumber()

        let maxNfts = await connectedContract.getMaxNFTSToMint();
        let numMaxNfts = maxNfts.toNumber()

        setMintedCreaturesMsg("Minted " + mintedNfts + "/" + maxNfts + " Mighty Creatures")

      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log(error)
    }
  }

  /*
  * This runs our function when the page loads.
  */
  useEffect(() => {
    checkIfWalletIsConnected();
  }, [])

  return (
    <div className="App">
      <div className="container">
        <div className="header-container">
          <p className="header gradient-text">Wichon's NFT Collection</p>
          <p className="sub-text">
            All mighty, all random, get your own mighty creature!
          </p>
          <p className="minted-text">
            {mintedCreaturesMsg}
          </p>
          <br/>
          {currentAccount === "" ? (
            renderNotConnectedContainer()
          ) : (
            /** Add askContractToMintNft Action for the onClick event **/
            <button onClick={askContractToMintNft} className={buttonClassName}>
              Mint NFT
            </button>
          )}
          <HashLoader color="#80ffea" loading={loading} css={override} size={70} margin={2} />
          <br/>
          <p className="minted-text">
            {newMintedNftMsg}
          </p>
          <img src={nftPreviewSrc} className={nftPreviewClass}/>
          <br/>
          <a alt="OpenSea Collection" className="nftCollectionLink" href="https://testnets.opensea.io/collection/mightyrandomcreatures-e8xjrdhsfx" target="_blank" rel="noreferrer">🦈 NFT Collection in OpenSea.io 🦀</a>
          <br/>
        </div>
        <div className="footer-container">
          
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >Made with 💛 by {`@${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;