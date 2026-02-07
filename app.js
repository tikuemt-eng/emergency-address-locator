document.addEventListener('DOMContentLoaded', () => {
    const zipcodeCircle = document.getElementById('zipcode');
    const searchButton = document.getElementById('searchButton');
    const addressInput = document.getElementById('addressInput');
    const clearButton = document.getElementById('clearButton');
    const copyButton = document.getElementById('copyButton');
    const mapButton = document.getElementById('mapButton');
    const logButton = document.getElementById('logButton');
    const noteInput = document.getElementById('noteInput');
    const currentTimeDisplay = document.getElementById('currentTime');
    const toast = document.getElementById('toast');

    // Google Maps Search Input (New)
    const googleSearchContainer = document.getElementById('googleSearchContainer');
    const googleSearchInput = document.getElementById('googleSearchInput');

    // 設定関連の要素
    const settingsButton = document.getElementById('settingsButton');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettings = document.getElementById('closeSettings');
    const saveSettings = document.getElementById('saveSettings');
    const googleApiKeyInput = document.getElementById('googleApiKey');

    // 音声入力・履歴関連
    const micButton = document.getElementById('micButton');
    const historyList = document.getElementById('historyList');
    const clearHistoryBtn = document.getElementById('clearHistory');

    // 時計の更新
    function updateTime() {
        const now = new Date();
        currentTimeDisplay.textContent = now.toLocaleTimeString('ja-JP', { hour12: false });
    }
    setInterval(updateTime, 1000);
    updateTime();

    // トースト通知
    function showToast(message) {
        toast.textContent = message;
        toast.classList.remove('hidden');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 2500);
    }

    // --- Google Maps Autocomplete ---
    let autocomplete;
    function initAutocomplete() {
        if (!window.google || !window.google.maps) return;

        // 新しい検索専用の入力欄にAutocompleteを割り当て
        autocomplete = new google.maps.places.Autocomplete(googleSearchInput, {
            componentRestrictions: { country: "jp" },
            fields: ["formatted_address"],
            types: ["address"],
        });

        // 候補選択時のみ値をセット
        autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            if (place && place.formatted_address) {
                let addr = place.formatted_address.replace("日本、", "").replace(/〒\d{3}-\d{4} /, "");

                // 検索結果をメインの住所欄に転記
                addressInput.value = addr;
                showToast('住所を確定しました');

                // 履歴に保存
                addToHistory(addr);

                // フォーカスをメイン欄に移動して追記を促す
                addressInput.focus();

                // 検索欄はクリアしてもいいし、そのままでもいいが、今回はクリアしないでおく
                // googleSearchInput.value = ''; 
            }
        });
    }

    // Google Maps Scriptの読み込み
    function loadGoogleMapsScript(apiKey) {
        if (!apiKey) return;
        if (document.getElementById('google-maps-script')) return;

        const script = document.createElement('script');
        script.id = 'google-maps-script';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initMapsCallback&language=ja&region=JP`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);

        window.initMapsCallback = () => {
            initAutocomplete();
            // Google Mapsが有効なら検索バーを表示
            googleSearchContainer.classList.remove('hidden');
            showToast('高精度検索が有効になりました');
        };
    }

    // 設定の読み込み
    function loadSettings() {
        const apiKey = localStorage.getItem('googleApiKey');
        const gasUrl = localStorage.getItem('gasWebappUrl');

        if (apiKey) {
            googleApiKeyInput.value = apiKey;
            loadGoogleMapsScript(apiKey);
            // ロード済みなら表示
            if (document.getElementById('google-maps-script')) {
                googleSearchContainer.classList.remove('hidden');
            }
        }
    }
    loadSettings();
    loadHistory(); // 履歴読み込み

    // 設定モーダルの開閉
    settingsButton.addEventListener('click', () => settingsModal.classList.remove('hidden'));
    closeSettings.addEventListener('click', () => settingsModal.classList.add('hidden'));
    saveSettings.addEventListener('click', () => {
        const apiKey = googleApiKeyInput.value.trim();

        localStorage.setItem('googleApiKey', apiKey);

        if (apiKey && !document.getElementById('google-maps-script')) {
            loadGoogleMapsScript(apiKey);
            googleSearchContainer.classList.remove('hidden');
        } else if (!apiKey) {
            // キーが消された場合は非表示に
            googleSearchContainer.classList.add('hidden');
            showToast('APIキーを削除しました。変更を完全に反映するにはリロードしてください。');
        }

        settingsModal.classList.add('hidden');
        showToast('設定を保存しました');
    });

    // モーダルの外側をクリックして閉じる
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.classList.add('hidden');
        }
    });

    // 郵便番号検索 (zipcloud API)
    searchButton.addEventListener('click', async () => {
        const zipcode = zipcodeCircle.value.replace(/-/g, '');
        if (zipcode.length !== 7) {
            showToast('郵便番号を7桁で入力してください');
            return;
        }

        searchButton.disabled = true;
        searchButton.textContent = '...';

        try {
            const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zipcode}`);
            const data = await response.json();

            if (data.status === 200 && data.results) {
                const result = data.results[0];
                const fullAddress = `${result.address1}${result.address2}${result.address3}`;
                addressInput.value = fullAddress;
                showToast('住所を取得しました');

                // 履歴に保存
                addToHistory(fullAddress);

                // 住所欄にフォーカスを当て、末尾にカーソルを移動
                setTimeout(() => {
                    addressInput.focus();
                    const val = addressInput.value;
                    addressInput.value = '';
                    addressInput.value = val;
                }, 100);
            } else {
                showToast('郵便番号から住所が見つかりませんでした');
            }
        } catch (error) {
            showToast('検索エラーが発生しました');
            console.error(error);
        } finally {
            searchButton.disabled = false;
            searchButton.textContent = '検索';
        }
    });

    // クリア機能
    clearButton.addEventListener('click', () => {
        zipcodeCircle.value = '';
        addressInput.value = '';
        noteInput.value = '';
        showToast('クリアしました');
    });

    // コピー機能
    copyButton.addEventListener('click', () => {
        if (!addressInput.value) {
            showToast('住所が入力されていません');
            return;
        }
        navigator.clipboard.writeText(addressInput.value);
        showToast('住所をコピーしました');
    });

    // Googleマップ連携
    mapButton.addEventListener('click', () => {
        const address = addressInput.value;
        if (!address) {
            showToast('住所を入力してください');
            return;
        }
        // Google Maps URL (ユニバーサルリンク)
        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
        window.open(mapUrl, '_blank');
    });

    // --- 履歴機能 ---
    function loadHistory() {
        const history = JSON.parse(localStorage.getItem('addressHistory') || '[]');
        renderHistory(history);
    }

    function addToHistory(address) {
        if (!address) return;
        let history = JSON.parse(localStorage.getItem('addressHistory') || '[]');

        // 重複削除して先頭に追加
        history = history.filter(item => item.address !== address);
        history.unshift({
            address: address,
            timestamp: new Date().toLocaleString('ja-JP')
        });

        // 最大10件まで
        if (history.length > 10) {
            history.pop();
        }

        localStorage.setItem('addressHistory', JSON.stringify(history));
        renderHistory(history);
    }

    function renderHistory(history) {
        historyList.innerHTML = '';
        if (history.length === 0) {
            historyList.innerHTML = '<li class="empty-history">履歴はありません</li>';
            return;
        }

        history.forEach(item => {
            const li = document.createElement('li');
            li.className = 'history-item';
            li.innerHTML = `
                <span class="history-address">${item.address}</span>
                <span class="history-time">${item.timestamp.split(' ')[1]}</span> 
            `; // 時間だけ表示
            li.addEventListener('click', () => {
                addressInput.value = item.address;
                showToast('履歴から入力しました');
                // フォーカスして末尾へ
                setTimeout(() => {
                    addressInput.focus();
                    const val = addressInput.value;
                    addressInput.value = '';
                    addressInput.value = val;
                }, 50);
            });
            historyList.appendChild(li);
        });
    }

    clearHistoryBtn.addEventListener('click', () => {
        if (confirm('履歴をすべて削除しますか？')) {
            localStorage.removeItem('addressHistory');
            renderHistory([]);
            showToast('履歴を削除しました');
        }
    });

    // --- 音声入力機能 (Web Speech API) ---
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.lang = 'ja-JP';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        micButton.addEventListener('click', () => {
            if (micButton.classList.contains('listening')) {
                recognition.stop();
            } else {
                recognition.start();
            }
        });

        recognition.onstart = () => {
            micButton.classList.add('listening');
            showToast('音声認識中... お話しください');
        };

        recognition.onend = () => {
            micButton.classList.remove('listening');
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;

            // 既存の入力がある場合は追記、なければ新規
            if (addressInput.value) {
                addressInput.value += ' ' + transcript;
            } else {
                addressInput.value = transcript;
            }

            showToast('音声入力を行いました');
            addressInput.focus();
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            micButton.classList.remove('listening');
            showToast('音声認識エラー: ' + event.error);
        };
    } else {
        micButton.style.display = 'none'; // 非対応ブラウザでは隠す
        console.log('Web Speech API not supported');
    }
});