const BASE_URL = 'http://localhost:8888/api';
const API_URLS = {
    sendMessage: `${BASE_URL}/message/send-message`,
    getMessage: (friendID) => `${BASE_URL}/message/get-message?FriendID=${friendID}`,
    images: `${BASE_URL}/images`,
    listFriend: `${BASE_URL}/message/list-friend`,
    updateUser: `${BASE_URL}/user/update`,
    infoUser: `${BASE_URL}/user/info`
};

function getToken() {
    return localStorage.getItem('token');
}

function getHeaders() {
    const token = getToken();
    return {
        'Authorization': `Bearer ${token}`
    };
}

function saveMessagesToLocal(friendID, messages) {
    localStorage.setItem(`messages_${friendID}`, 
    encryptMessage(JSON.stringify(messages), sessionStorage.getItem('password'))
    .then(encryptedData => {
        console.log("Encrypted message:", encryptedData);
        localStorage.setItem('encryptedMessage', JSON.stringify(encryptedData));
    })
    .catch(error => {
        console.error('Encryption error:', error);
    }));
}

function getMessagesFromLocal(friendID) {
    var messages = localStorage.getItem(`messages_${friendID}`);
    return messages ? JSON.parse(messages) : [];
}

function saveFriendsToLocal(friends) {
    localStorage.setItem('friendsList', JSON.stringify(friends));
}

function getFriendsFromLocal() {
    const friends = localStorage.getItem('friendsList');
    return friends ? JSON.parse(friends) : [];
}

function saveAvatarFriendInMessage(avatarFriendInMessage) {
    localStorage.setItem('avatarFriendInMessage', avatarFriendInMessage);
}

function saveRenamedFriend(friendId, newName) {
    try {
        const renamedFriends = JSON.parse(localStorage.getItem('renamedFriends')) || {};
        renamedFriends[friendId] = newName;
        localStorage.setItem('renamedFriends', JSON.stringify(renamedFriends));
        console.log(`Saved renamed friend: friendId=${friendId}, newName=${newName}`);
    } catch (error) {
        console.error('Error saving renamed friend:', error);
    }
}

function getFriendName(friend) {
    const renamedFriends = JSON.parse(localStorage.getItem('renamedFriends')) || {};
    return renamedFriends[friend.FriendID] || friend.FullName || "Unknown";
} 

async function encryptMessage(message, password) {
    try {
        const encoder = new TextEncoder();
        const encodedMessage = encoder.encode(message);
        const keyMaterial = await crypto.subtle.digest('SHA-256', encoder.encode(password));
        const key = await crypto.subtle.importKey(
            'raw', keyMaterial,
            { name: 'AES-GCM' }, false, ['encrypt']);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            encodedMessage
        );
        const encryptedBase64 = {
            ciphertext: btoa(String.fromCharCode.apply(null, new Uint8Array(encrypted))),
            iv: btoa(String.fromCharCode.apply(null, iv))
        };

        return encryptedBase64;
    } catch (error) {
        console.error('Encryption error:', error);
        throw error;
    }
}

async function decryptMessage(encryptedData, password) {
    try {
        const decoder = new TextDecoder();
        const ciphertext = Uint8Array.from(atob(encryptedData.ciphertext), c => c.charCodeAt(0));
        const iv = Uint8Array.from(atob(encryptedData.iv), c => c.charCodeAt(0));
        const keyMaterial = await crypto.subtle.digest('SHA-256', encoder.encode(password));
        const key = await crypto.subtle.importKey(
            'raw', keyMaterial,
            { name: 'AES-GCM' }, false, ['decrypt']);
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            ciphertext
        );
        const decryptedMessage = decoder.decode(decrypted);
        return decryptedMessage;
    } catch (error) {
        console.error('Decryption error:', error);
        throw error;
    }
}

$(document).ready(function () {
    $('#textInput').keydown(function (event) {
        if (event.keyCode === 13) {
            if (event.shiftKey) {
                return;
            } else {
                event.preventDefault();
                sendTextMessage();
            }
        }
    });

    $('#sendButton').on('click', function () {
        sendTextMessage();
    });

    function sendTextMessage() {
        const text = $('#textInput').val().trim();
        const file = $('#fileInput')[0].files[0];

        if (!file && text === '') {
            return;
        }

        if (text !== '') {
            var messageData = {
                FriendID: localStorage.getItem('FriendID'),
                Content: text,
                CreatedAt: new Date().toISOString(),
                isSend: 1, 
                Images: [],
                Files: []
            };
            appendMessage(messageData);
            sendTextMessageToServer(text);
        }

        if (file) {
            uploadFile(file, text);
        }

        $('#textInput').val(''); 
    }

    function sendTextMessageToServer(text) {
        const formdata = new FormData();
        formdata.append("FriendID", localStorage.getItem('FriendID'));
        formdata.append("Content", text);

        const requestOptions = {
            method: "POST",
            headers: getHeaders(), 
            body: formdata,
            redirect: "follow"
        };

        fetch("http://localhost:8888/api/message/send-message", requestOptions)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(result => {
            
            })
            .catch(error => console.error('Error:', error));
    }

    function uploadFile(file, text) {
        const formdata = new FormData();
        formdata.append("FriendID", localStorage.getItem('FriendID'));
        formdata.append("files", file);
        if (text !== '') {
            formdata.append("Content", text);
        }

        const xhr = new XMLHttpRequest();
        xhr.open("POST", "http://localhost:8888/api/message/send-message", true);

        xhr.upload.onprogress = function(event) {
            if (event.lengthComputable) {
                var percentComplete = (event.loaded / event.total) * 100;
                console.log(`Upload progress: ${percentComplete}%`);
            }
        };

        xhr.onload = function () {
            if (xhr.status === 200) {
                var result = JSON.parse(xhr.responseText);
                appendMessage(result.data);
            } else {
                console.error(`HTTP error! Status: ${xhr.status}`);
            }
            $('#fileInput').val('');
        };

        xhr.onerror = function () {
            console.error('Request failed');
        };

        xhr.setRequestHeader('Authorization', getHeaders().Authorization); // Add your authorization header
        xhr.send(formdata);
    }

    function appendMessage(messages) {
        const isSend = messages.isSend;
        const sentReceivedIcon = isSend === 0 ? 'sent.png' : 'received.png';
        const currentTime = new Date(messages.CreatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });

        $('.noMessages').remove();
        $('.titleNoMessages').remove();

        let chatMessage = '';

        if (messages.Images.length > 0) {
            messages.Images.forEach(image => {
                const urlImage = `${BASE_URL}/${image.urlImage}`;
                chatMessage = `        
                    <div class="myColumn">
                        <div class="myFormatColumn">
                            <div class="textBlockInColumn">
                                <div class="myFormatBlock">
                                    <div class="Image" style="width: 256px;">
                                        <a href="${urlImage}" download>
                                            <img src="${urlImage}" alt="image" width="252px" height="188px" style="background-image: url(https://via.placeholder.com/252x188);border-radius: 5%;">
                                        </a>
                                        <div class="letterAlignmentInBlock">
                                            <div class="myMessage multiLineText">${messages.Content || ''}</div>
                                        </div>
                                        <img src="../../images/iconSmileInMessage.png" alt="iconSmileInMessage" class="iconright hiddenIcon" id="iconSmileRight">
                                        <img src="../../images/iconMenuInMessage.png" alt="iconMenuInMessage" class="iconright hiddenIcon" id="iconMenuRight">
                                    </div> 
                                </div>
                            </div>
                            <div style="display: inline-flex">
                                <div class="messageTime">${currentTime}</div>
                                <img src="../../images/${sentReceivedIcon}" alt="watched">
                            </div>
                        </div>
                    </div>`;
                $('#chatContainer').append(chatMessage);
            });
        } else if (messages.Files.length > 0) {
            messages.Files.forEach(file => {
                const urlFile = `${BASE_URL}/${file.urlFile}`;
                chatMessage = `        
                    <div class="myColumn">
                        <div class="myFormatColumn">
                            <div class="textBlockInColumn">
                                <div class="myFormatBlock">
                                    <div class="Image" style="width: 300px; overflow:hidden;text-overflow: ellipsis;white-space: nowrap;">
                                        <a href="${urlFile}" download>
                                            <img src="../../images/iconfile.png" alt="" width="30px" height="30px"  style="margin-left: 5%; margin-top: 10%;">
                                            <span style="font-size: 40px;">${file.FileName}</span>
                                        </a>
                                        <div class="letterAlignmentInBlock">
                                            <div class="myMessage multiLineText">${messages.Content || ''}</div>
                                        </div>
                                        <img src="../../images/iconSmileInMessage.png" alt="iconSmileInMessage" class="iconright hiddenIcon" id="iconSmileRight">
                                        <img src="../../images/iconMenuInMessage.png" alt="iconMenuInMessage" class="iconright hiddenIcon" id="iconMenuRight">
                                    </div>
                                </div>
                            </div>
                            <div style="display: inline-flex">
                                <div class="messageTime">${currentTime}</div>
                                <img src="../../images/${sentReceivedIcon}" alt="watched">
                            </div>
                        </div>
                    </div>`;
                $('#chatContainer').append(chatMessage);
            });
        } else {
            chatMessage = `        
                <div class="myColumn">
                    <div class="myFormatColumn">
                        <div class="textBlockInColumn">
                            <div class="myFormatBlock">
                                <div class="letterAlignmentInBlock">
                                    <div class="myMessage multiLineText">${messages.Content}</div>
                                </div>
                                <img src="../../images/iconSmileInMessage.png" alt="iconSmileInMessage" class="iconright hiddenIcon" id="iconSmileRight">
                                <img src="../../images/iconMenuInMessage.png" alt="iconMenuInMessage" class="iconright hiddenIcon" id="iconMenuRight">
                            </div>
                        </div>
                        <div style="display: inline-flex">
                            <div class="messageTime">${currentTime}</div>
                            <img src="../../images/${sentReceivedIcon}" alt="watched">
                        </div>
                    </div>
                </div>`;
            $('#chatContainer').append(chatMessage);
        }
    }
});


function getMessages() {
    let friendID = localStorage.getItem('FriendID');
    const requestOptions = {
        method: "GET",
        headers: getHeaders(),
        redirect: "follow"
    };
    fetch(API_URLS.getMessage(friendID), requestOptions)
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(async result => {
        let chatMessage = '';
        const messages = result.data;
        try {
            await saveMessagesToLocal(friendID, messages);
        } catch (error) {
            console.error('Error saving messages to local:', error);
        }
        $('#chatContainer').empty();
        if (messages.length == 0) {
            chatMessage = `<img src="../../images/Empty State.png" alt="" class="noMessages">
            <div class="titleNoMessages">Chưa có tin nhắn…</div>`;
            $('#chatContainer').append(chatMessage);
        } else {
            displayMessages(messages);
        }
    })
    .catch(async error => {
        console.error('Error:', error);
        try {
            const messages = await getMessagesFromLocal(friendID);
            displayMessages(messages);
        } catch (localError) {
            console.error('Error loading messages from local:', localError);
        }
    });
}

setInterval(getLatestMessages, 5000);

function getLatestMessages() {
    let friendID = localStorage.getItem('FriendID');
    let lastTime = localStorage.getItem('LastTime');
    let url = API_URLS.getMessage(friendID);
    if (lastTime) {
        url += `&LastTime=${lastTime}`;
    }
    const requestOptions = {
        method: "GET",
        headers: getHeaders(),
        redirect: "follow"
    };
    fetch(url, requestOptions)
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(result => {
        var messages = result.data;
        if (messages.length > 0) {
            var latestMessageTime = messages[messages.length - 1].CreatedAt;
            localStorage.setItem('LastTime', latestMessageTime);
            displayFriendMessages(messages);
        } else {
            console.log('No new messages');
        }

    })
    .catch(error => console.error('Error:', error));
}

function displayMessages(messages) {
    let avatarFriend = localStorage.getItem('avatarFriendInMessage');
    if (avatarFriend == 'null' || avatarFriend == 'undefined') {
        avatarFriend = "/../../images/images.png";
    }else{
        avatarFriend = `${API_URLS.images}/${avatarFriend}`
    }
    $('#chatContainer').empty();
    messages.forEach(message => {
        let chatMessage = '';
        const currentTime = new Date(message.CreatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
        if (message.MessageType == 0) {
            if (message.Images.length > 0) {
                message.Images.forEach(image => {
                    const urlImage = `${BASE_URL}/${image.urlImage}`;
                    chatMessage += `
                        <div class="friendColumn">
                            <div class="avatarFriend">
                                <div class="photoShape">
                                    <img width="36px" height="36px" src="${avatarFriend}" id="avatarInMessageFriend" style="border-radius: 50%;" />
                                </div>
                            </div>
                            <div class="messageBlock">
                                <div class="messageShape">
                                    <div class="messageShapeFormat">
                                        <div class="Image" style="width: 290px;">
                                            <a href="${urlImage}" download>
                                                <img src="${urlImage}" alt="" width="320px" height="236px" style="background-image: url(https://via.placeholder.com/252x188); border-radius: 5%; margin-left: -15px; margin-top: -7px;">
                                            </a>
                                            <div class="messageFriendTextFormat multiLineText">${message.Content || ''}</div>
                                        </div>
                                        <img src="../../images/iconSmileInMessage.png" alt="iconSmileInMessage" class="iconleft hiddenIcon" id="iconSmileLeft">
                                        <img src="../../images/iconMenuInMessage.png" alt="iconMenuInMessage" class="iconleft hiddenIcon" id="iconMenuLeft">
                                    </div>
                                </div>
                                <div class="messageTime">${currentTime}</div>
                            </div>
                        </div>`;
                });
            } else if (message.Files.length > 0) {
                message.Files.forEach(file => {
                    const urlFile = `${BASE_URL}/${file.urlFile}`;
                    chatMessage += `
                        <div class="friendColumn">
                            <div class="avatarFriend">
                                <div class="photoShape">
                                    <img width="36px" height="36px" src="${avatarFriend}" id="avatarInMessageFriend" style="border-radius: 50%;" />
                                </div>
                            </div>
                            <div class="messageBlock">
                                <div class="messageShape">
                                    <div class="messageShapeFormat">
                                        <div class="Image" style="width: 300px; overflow:hidden;text-overflow: ellipsis;white-space: nowrap;">
                                        <a href="${urlFile}" download>
                                            <img src="../../images/iconfile.png" alt="" width="30px" height="30px"  style="margin-left: 5%; margin-top: 10%;">
                                            <span style="font-size: 40px;">${file.FileName}</span>
                                        </a>   
                                            <div class="messageFriendTextFormat multiLineText">${message.Content || ''}</div>   
                                        </div>
                                        <img src="../../images/iconSmileInMessage.png" alt="iconSmileInMessage" class="iconleft hiddenIcon" id="iconSmileLeft">
                                        <img src="../../images/iconMenuInMessage.png" alt="iconMenuInMessage" class="iconleft hiddenIcon" id="iconMenuLeft">
                                    </div>
                                </div>  
                                <div class="messageTime">${currentTime}</div>
                            </div>
                        </div>`;
                });
            } else {
                chatMessage += `
                <div class="friendColumn">
                    <div class="avatarFriend">
                        <div class="photoShape">
                            <img width="36px" height="36px" src="${avatarFriend}" id="avatarInMessageFriend" style="border-radius: 50%;" />
                        </div>
                    </div>
                    <div class="messageBlock">
                        <div class="messageShape">
                            <div class="messageShapeFormat">
                                <div class="messageFriendTextFormat multiLineText">${message.Content || ''}</div>
                            <img src="../../images/iconSmileInMessage.png" alt="iconSmileInMessage" class="iconleft hiddenIcon" id="iconSmileLeft">
                            <img src="../../images/iconMenuInMessage.png" alt="iconMenuInMessage" class="iconleft hiddenIcon" id="iconMenuLeft">
                            </div>
                        </div>
                        <div class="messageTime">${currentTime}</div>
                    </div>
                </div>`;
            }
        } else {
            if (message.Images.length > 0) {
                message.Images.forEach(image => {
                    let urlImage = `${BASE_URL}/${image.urlImage}`;
                    chatMessage += `        
                        <div class="myColumn">
                            <div class="myFormatColumn">
                                <div class="textBlockInColumn">
                                    <div class="myFormatBlock">
                                        <div class="Image" style="width: 300px;">
                                            <a href="${urlImage}" download>
                                                <img src="${urlImage}" alt="" width="300px" height="236px" style="background-image: url(https://via.placeholder.com/252x188); border-radius: 5%; margin-top: 0px;">
                                            </a>
                                            <div class="letterAlignmentInBlock">
                                                <div class="myMessage multiLineText">${message.Content || ''}</div>
                                            </div>
                                            <img src="../../images/iconSmileInMessage.png" alt="iconSmileInMessage" class="iconright hiddenIcon" id="iconSmileRight">
                                            <img src="../../images/iconMenuInMessage.png" alt="iconMenuInMessage" class="iconright hiddenIcon" id="iconMenuRight">
                                            </div>
                                        </div>
                                    </div>
                                <div style="display: inline-flex">
                                    <div class="messageTime">${currentTime}</div>
                                    <img src="../../images/received.png" alt="watched">
                                </div>
                            </div>
                        </div>`;
                });
            } else if (message.Files.length > 0) {
                message.Files.forEach(file => {
                    let urlFile = `${BASE_URL}/${file.urlFile}`;
                    chatMessage += `        
                        <div class="myColumn">
                            <div class="myFormatColumn">
                                <div class="textBlockInColumn">
                                    <div class="myFormatBlock">
                                        <div class="Image" style="width: 300px; overflow:hidden;text-overflow: ellipsis;white-space: nowrap;">
                                            <a href="${urlFile}" download>
                                                <img src="../../images/iconfile.png" alt="" width="30px" height="30px"  style="margin-left: 5%; margin-top: 10%;">
                                                <span style="font-size: 40px;">${file.FileName}</span>
                                            </a>
                                            <div class="letterAlignmentInBlock">
                                                <div class="myMessage multiLineText">${message.Content || ''}</div>
                                            </div>
                                            <img src="../../images/iconSmileInMessage.png" alt="iconSmileInMessage" class="iconright hiddenIcon" id="iconSmileRight">
                                            <img src="../../images/iconMenuInMessage.png" alt="iconMenuInMessage" class="iconright hiddenIcon" id="iconMenuRight">
                                        </div>
                                    </div>
                                </div>
                                <div style="display: inline-flex">
                                    <div class="messageTime">${currentTime}</div>
                                    <img src="../../images/received.png" alt="watched">
                                </div>
                            </div>
                        </div>`;
                });
            } else {
                chatMessage += `        
                    <div class="myColumn">
                        <div class="myFormatColumn">
                            <div class="textBlockInColumn">
                                <div class="myFormatBlock">
                                    <div class="letterAlignmentInBlock">
                                        <div class="myMessage multiLineText">${message.Content || ''}</div>
                                    </div>
                                    <img src="../../images/iconSmileInMessage.png" alt="iconSmileInMessage" class="iconright hiddenIcon" id="iconSmileRight">
                                    <img src="../../images/iconMenuInMessage.png" alt="iconMenuInMessage" class="iconright hiddenIcon" id="iconMenuRight">
                                </div>
                            </div>
                            <div style="display: inline-flex">
                                <div class="messageTime">${currentTime}</div>
                                <img src="../../images/received.png" alt="watched">
                            </div>
                        </div>
                    </div>`;
            }
        }
        $('#chatContainer').append(chatMessage);
    });
}

function displayFriendMessages(messages) {
    let avatarFriend = localStorage.getItem('avatarFriendInMessage');
    if (avatarFriend == 'null' || avatarFriend == 'undefined') {
        avatarFriend = "/../../images/images.png";
    }else{
        avatarFriend = `${API_URLS.images}/${avatarFriend}`
    }
    let chatMessage = '';
    messages.forEach(message => {
        const currentTime = new Date(message.CreatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
        if (message.MessageType == 0) {
            if (message.Images.length > 0) {
                message.Images.forEach(image => {
                    var urlImage = `${BASE_URL}/${image.urlImage}`;
                    chatMessage += `
                        <div class="friendColumn">
                            <div class="avatarFriend">
                                <div class="photoShape">
                                    <img width="36px" height="36px" src="${avatarFriend}" id="avatarInMessageFriend" style="border-radius: 50%;" />
                                </div>
                            </div>
                            <div class="messageBlock">
                                <div class="messageShape">
                                    <div class="messageShapeFormat">
                                        <div class="Image" style="width: 290px;">
                                            <a href="${urlImage}" download>
                                                <img src="${urlImage}" alt="" width="320px" height="236px" style="background-image: url(https://via.placeholder.com/252x188); border-radius: 5%; margin-left: -15px; margin-top: -7px;">
                                            </a>
                                            <div class="messageFriendTextFormat multiLineText">${message.Content || ''}</div>     
                                        </div>
                                        <img src="../../images/iconSmileInMessage.png" alt="iconSmileInMessage" class="iconleft hiddenIcon" id="iconSmileLeft">
                                        <img src="../../images/iconMenuInMessage.png" alt="iconMenuInMessage" class="iconleft hiddenIcon"id="iconMenuLeft">
                                    </div>
                                </div>
                                <div class="messageTime">${currentTime}</div>
                            </div>
                        </div>`;
                });
            } else if (message.Files.length > 0) {
                message.Files.forEach(file => {
                    var urlFile = `${BASE_URL}/${file.urlFile}`;
                    chatMessage += `
                        <div class="friendColumn">
                            <div class="avatarFriend">
                                <div class="photoShape">
                                    <img width="36px" height="36px" src="${avatarFriend}" id="avatarInMessageFriend" style="border-radius: 50%;" />
                                </div>
                            </div>
                            <div class="messageBlock">
                                <div class="messageShape">
                                    <div class="messageShapeFormat">
                                        <div class="Image" style="width: 300px; overflow:hidden;text-overflow: ellipsis;white-space: nowrap;">
                                            <a href="${urlFile}" download>
                                                <img src="../../images/iconfile.png" alt="" width="30px" height="30px"  style="margin-left: 5%; margin-top: 10%;">
                                                <span style="font-size: 40px;">${file.FileName}</span>
                                            </a>   
                                            <div class="messageFriendTextFormat multiLineText">${message.Content || ''}</div> 
                                        </div>
                                        <img src="../../images/iconSmileInMessage.png" alt="iconSmileInMessage" class="iconleft hiddenIcon" id="iconSmileLeft">
                                        <img src="../../images/iconMenuInMessage.png" alt="iconMenuInMessage" class="iconleft hiddenIcon" id="iconMenuLeft">
                                    </div>
                                </div>
                                <div class="messageTime">${currentTime}</div>
                            </div>
                        </div>`;
                });
            } else {
                chatMessage += `
                <div class="friendColumn">
                    <div class="avatarFriend">
                        <div class="photoShape">
                            <img width="36px" height="36px" src="${avatarFriend}" id="avatarInMessageFriend" style="border-radius: 50%;" />
                        </div>
                    </div>
                    <div class="messageBlock">
                        <div class="messageShape">
                            <div class="messageShapeFormat">
                                <div class="messageFriendTextFormat multiLineText">${message.Content || ''}</div>
                                <img src="../../images/iconSmileInMessage.png" alt="iconSmileInMessage" class="iconleft hiddenIcon" id="iconSmileLeft">
                                <img src="../../images/iconMenuInMessage.png" alt="iconMenuInMessage" class="iconleft hiddenIcon" id="iconMenuLeft">
                            </div>
                        </div>
                        <div class="messageTime">${currentTime}</div>
                    </div>
                </div>`;
            }
            $('#chatContainer').append(chatMessage);
        }
    });
}

document.getElementById('loadFriends').addEventListener('input', function (event) {
    if (event.target.value) {
        const searchValue = event.target.value.toLowerCase();
        const filteredFriends = friendsData.filter(friend => friend.FullName && friend.FullName.toLowerCase().includes(searchValue));
        displayFriends(filteredFriends);
    } else {
        displayFriends(friendsData);
    }
});

document.getElementById('loadFriends').addEventListener('click', function (event) {
    fetch(API_URLS.listFriend, {
        method: 'GET',
        headers: getHeaders()
    })
    .then(response => response.json())
    .then(data => {
        if (data.status !== 1) {
            alert('Failed to load friends list');
            return;
        }
        friendsData = data.data;
        saveFriendsToLocal(friendsData);
        displayFriends(friendsData);
    })
    .catch(error => {
        console.error('Error loading friends:', error);
        displayFriends(getFriendsFromLocal());

    });
});

textChat.addEventListener('dblclick', function (event) {
    fetch(API_URLS.listFriend, {
        method: 'GET',
        headers: getHeaders()
    })
    .then(response => response.json())
    .then(data => {
        if (data.status !== 1) {
            alert('Failed to load friends list');
            return;
        }

        friendsData = data.data;
        saveFriendsToLocal(friendsData);
        displayChatFriends(friendsData);
    })
    .catch(error => {
        console.error('Error loading friends:', error);
        displayChatFriends(getFriendsFromLocal());
    });   
});

function fetchLastMessage(sFriendID, messageContent) {
    fetch(`http://localhost:8888/api/message/get-message?FriendID=${sFriendID}`, {
        method: 'GET',
        headers: getHeaders()
    })
    .then(response => response.json())
    .then(data => {
        if (data.status !== 1) {
            messageContent.textContent = "Chưa có tin nhắn";
            return;
        }
        const messages = data.data;
        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            const displayMessage = constructDisplayMessage(lastMessage);
            messageContent.textContent = displayMessage;
        } else {
            messageContent.textContent = "Chưa có tin nhắn";
        }
    })
    .catch(error => {
        console.error('Error fetching last message:', error);
        messageContent.textContent = "Chưa có tin nhắn";
    });
}

function constructDisplayMessage(lastMessage) {
    let displayMessage = '';
    const nMessageType = lastMessage.MessageType;

    if (nMessageType === 0) {
        if (lastMessage.Content) {
            displayMessage = lastMessage.Content;
        } else if (lastMessage.Images && lastMessage.Images.length > 0) {
            displayMessage = "Đã gửi 1 ảnh";
        } else if (lastMessage.Files && lastMessage.Files.length > 0) {
            displayMessage = "Đã gửi 1 file";
        }
    } else if (nMessageType === 1) {
        if (lastMessage.Content) {
            displayMessage = `Bạn: ${lastMessage.Content}`;
        } else if (lastMessage.Images && lastMessage.Images.length > 0) {
            displayMessage = "Bạn: Đã gửi 1 ảnh";
        } else if (lastMessage.Files && lastMessage.Files.length > 0) {
            displayMessage = "Bạn: Đã gửi 1 file";
        }
    }

    return displayMessage;
}

function displayChatFriends(friends) {
    const friendsListDiv = document.getElementById('friendList');
    friendsListDiv.innerHTML = '';
    friends.forEach(friend => {
        const chatBlock = document.createElement('div');
        chatBlock.className = 'chatBlock';
        chatBlock.dataset.friendId = friend.FriendID;
        chatBlock.addEventListener('click', function () {
            const headerTitle = document.getElementById('headerTitle');
            const subHeader = document.getElementById('subHeader');
            const status = document.getElementById('statusIsSelected');
            const avatarHeaderImg = document.getElementById('avatarFriendIsSelect');
            localStorage.setItem('FriendID', friend.FriendID);
            saveAvatarFriendInMessage(friend.Avatar);
            headerTitle.textContent = getFriendName(friend);
            subHeader.textContent = friend.isOnline ? 'Online' : 'Offline';
            avatarHeaderImg.src = friend.Avatar ? `${API_URLS.images}/${friend.Avatar}` : '../../images/images.png';
            if (friend.isOnline) {
                status.className = 'onlineStatusIsSelected';
            } else {
                status.className = 'offlineStatusIsSelected';
            }
            getMessages();
        });
        const individualPhoto = document.createElement('div');
        individualPhoto.className = 'individualPhoto';
        const img = document.createElement('img');
        img.alt = friend.FullName;
        img.className = 'avatarHeader';
        img.src = friend.Avatar ? `${API_URLS.images}/${friend.Avatar}` : '../../images/images.png';
        img.width = 49;
        img.height = 49;
        const dotStatus = document.createElement('div');
        const messageBlock = document.createElement('div');
        messageBlock.className = 'messageBlock';
        const friendName = document.createElement('div');
        friendName.className = 'friendName';
        friendName.textContent = getFriendName(friend);
        const messageContent = document.createElement('div');
        messageContent.className = 'messageContent';
        individualPhoto.appendChild(img);
        messageBlock.appendChild(friendName);
        individualPhoto.appendChild(dotStatus);
        chatBlock.appendChild(individualPhoto);
        chatBlock.appendChild(messageBlock);
        messageBlock.appendChild(messageContent);
        friendsListDiv.appendChild(chatBlock);
        fetchLastMessage(friend.FriendID, messageContent);
    });
}

function displayFriends(friends) {
    const friendsListDiv = document.getElementById('friendList');
    friendsListDiv.innerHTML = '';
    friends.forEach(friend => {
        const chatBlock = document.createElement('div');
        chatBlock.className = 'chatBlock';
        chatBlock.dataset.friendId = friend.FriendID;
        chatBlock.addEventListener('click', function () {
            const headerTitle = document.getElementById('headerTitle');
            const subHeader = document.getElementById('subHeader');
            const status = document.getElementById('statusIsSelected');
            const avatarHeaderImg = document.getElementById('avatarFriendIsSelect');
            localStorage.setItem('FriendID', friend.FriendID);
            saveAvatarFriendInMessage(friend.Avatar);
            headerTitle.textContent = getFriendName(friend);
            subHeader.textContent = friend.isOnline ? 'Online' : 'Offline';
            avatarHeaderImg.src = friend.Avatar ? `${API_URLS.images}/${friend.Avatar}` : '../../images/images.png';
            if (friend.isOnline) {
                status.className = 'onlineStatusIsSelected';
            } else {
                status.className = 'offlineStatusIsSelected';
            }
            getMessages();
        });
        const individualPhoto = document.createElement('div');
        individualPhoto.className = 'individualPhoto';
        const img = document.createElement('img');
        img.alt = friend.FullName;
        img.className = 'avatarHeader';
        img.src = friend.Avatar ? `${API_URLS.images}/${friend.Avatar}` : '../../images/images.png';
        img.width = 49;
        img.height = 49;
        const dotStatus = document.createElement('div');
        dotStatus.className = friend.isOnline ? 'dotStatusOnline' : 'dotStatusNotOnline';
        const messageBlock = document.createElement('div');
        messageBlock.className = 'messageBlock';
        const friendName = document.createElement('div');
        friendName.className = 'friendName';
        friendName.textContent = getFriendName(friend);
        individualPhoto.appendChild(img);
        messageBlock.appendChild(friendName);
        individualPhoto.appendChild(dotStatus);
        chatBlock.appendChild(individualPhoto);
        chatBlock.appendChild(messageBlock);
        friendsListDiv.appendChild(chatBlock);
    });
}

window.addEventListener('offline', function () {
    const messages = getMessagesFromLocal();
    displayMessages(messages);
    const friends = getFriendsFromLocal();
    displayFriends(friends);
    displayChatFriends(friends);
})

function fetchChatFriendsData() {
    fetch(API_URLS.listFriend, {
        method: 'GET',
        headers: getHeaders()
    })
    .then(response => response.json())
    .then(data => {
        if (data.status !== 1) {
            alert('Failed to load friends list');
            return;
        }

        friendsData = data.data;
        displayChatFriends(friendsData);
    })
    .catch(error => {
        console.error('Error loading friends:', error);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const elements = {
        userAvatar: document.getElementById('userAvatar'),
        userName: document.getElementById('userName'),
        imageInput: document.getElementById('imageInput'),
        renameBox: document.getElementById('reUserNameBox'),
        newNameInput: document.getElementById('newUserName'),
        renameButton: document.getElementById('reUserNameButton')
    };

    elements.imageInput.addEventListener('change', handleAvatarChange);

    function handleAvatarChange(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            elements.userAvatar.src = e.target.result;
            updateUser(null, file); 
        };
        reader.readAsDataURL(file);
    }
}

    function updateUser(newName, newAvatarFile) {
        const formData = new FormData();
        if (newName) formData.append('FullName', newName);
        if (newAvatarFile) formData.append('avatar', newAvatarFile);

        fetch(API_URLS.updateUser, {
            method: 'POST',
            headers: getHeaders(),
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 1) {
                console.log('Update success');
                if (newName) {
                    localStorage.setItem('fullname', newName);
                }
                loadUserInfo(); 
            } else {
                console.log('Update failed', data.message);
            }
        })
        .catch(error => console.error('Error:', error));
    }

    function loadUserInfo() {
        fetch(API_URLS.infoUser, {
            method: 'GET',
            headers: getHeaders()
        })
        .then(response => response.json())
        .then(userInfo => {
            if (userInfo.status === 1) {
                if (userInfo.data.Avatar) {
                    localStorage.setItem('avatar', userInfo.data.Avatar);
                    elements.userAvatar.src = `${API_URLS.images}/${userInfo.data.Avatar}`;
                }
            } else {
                console.log('Failed to load user info:', userInfo.message);
            }
        })
        .catch(error => console.error('Error:', error));
    }

    const showRenameBox = (event) => {
        event.preventDefault();
        elements.renameBox.style.display = 'block';
        elements.renameBox.style.left = `${event.pageX}px`;
        elements.renameBox.style.top = `${event.pageY}px`;
        elements.newNameInput.value = elements.userName.textContent;
        elements.newNameInput.focus();
    };
    
    const handleRename = () => {
        const newName = elements.newNameInput.value.trim();
        if (newName) {
            elements.userName.textContent = newName;
            updateUser(newName, null);
        }
        elements.renameBox.style.display = 'none';
    };
    const hideRenameBox = (event) => {
        if (!elements.renameBox.contains(event.target) && event.target !== elements.userName) {
            elements.renameBox.style.display = 'none';
        }
    };
    const hideRenameBoxOnEscape = (event) => {
        if (event.key === 'Escape') {
            elements.renameBox.style.display = 'none';
        }
    };
    elements.userAvatar.addEventListener('click', () => elements.imageInput.click());
    elements.imageInput.addEventListener('change', handleAvatarChange);
    elements.userName.addEventListener('contextmenu', showRenameBox);
    elements.renameButton.addEventListener('click', handleRename);
    document.addEventListener('click', hideRenameBox);
    document.addEventListener('keydown', hideRenameBoxOnEscape);
    const fullName = localStorage.getItem('fullname');
    const avatar = localStorage.getItem('avatar');
    const avatarElement = document.getElementById('userAvatar');
    const nameElement = document.getElementById('userName');
    nameElement.textContent = fullName || '';
    if (avatar && avatar !== 'null' && avatar !== 'undefined') {
        avatarElement.src = `${API_URLS.images}/${avatar}`;
    } else {
        avatarElement.src = "../../images/images.png";
    }
    if (!navigator.onLine) {
        const messages = getMessagesFromLocal();
        displayMessages(messages);
        const friends = getFriendsFromLocal();
        displayFriends(friends);
    }
    fetchChatFriendsData();
    const imageMenu = document.getElementById("imageMenu");
    const menuBlock = document.getElementById("menuBlock");
    const emojiButton = document.querySelector(".emojiButton");
    const emojiPopup = document.getElementById("emojiPopup");
    const textInput = document.getElementById("textInput");
    const fileButton = document.getElementById("fileButton");
    const fileInput = document.getElementById("fileInput");
    imageMenu.addEventListener("click", () => {
        menuBlock.style.display = (menuBlock.style.display === "none") ? "block" : "none";
    });
    document.addEventListener("click", (event) => {
        if (!menuBlock.contains(event.target) && event.target !== imageMenu) {
            menuBlock.style.display = "none";
        }
    });
    emojiButton.addEventListener("click", () => {
        emojiPopup.style.display = (emojiPopup.style.display === "none" || !emojiPopup.style.display) ? "flex" : "none";
    });
    document.addEventListener("click", (event) => {
        if (!emojiPopup.contains(event.target) && event.target !== emojiButton) {
            emojiPopup.style.display = "none";
        }
    });
    fileButton.addEventListener('click', () => {
        fileInput.click();
    });
    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                console.log(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    });
    emojiPopup.addEventListener("click", (event) => {
        if (event.target.tagName === "SPAN") {
            textInput.value += event.target.textContent;
        }
    });
    
});

const friendsList = document.getElementById('friendList');
const renameBox = document.getElementById('renameBox');
const newNameInput = document.getElementById('newName');
let currentFriend;

friendsList.addEventListener('contextmenu', function (event) {
    event.preventDefault();
    const friendElement = event.target.closest('.chatBlock');
    if (friendElement) {
        currentFriend = friendElement;
        const friendNameElement = friendElement.querySelector('.friendName');
        if (friendNameElement) {
            const rect = friendElement.getBoundingClientRect();
            renameBox.style.top = `${rect.bottom}px`;
            renameBox.style.left = `${rect.left}px`;
            renameBox.style.display = 'block';
            newNameInput.value = friendNameElement.textContent;
            newNameInput.focus();
        }
    }
});

document.getElementById('renameButton').addEventListener('click', function () {
    if (currentFriend && newNameInput.value.trim()) {
        const headerTitle = document.getElementById('headerTitle');
        const friendId = currentFriend.dataset.friendId;
        const friendNameElement = currentFriend.querySelector('.friendName');
        if (friendNameElement) {
            friendNameElement.textContent = newNameInput.value.trim();
            headerTitle.textContent = newNameInput.value.trim();
            saveRenamedFriend(friendId, newNameInput.value.trim());
            renameBox.style.display = 'none';
        }
    }
});

document.addEventListener('click', function (event) {
    if (!renameBox.contains(event.target) && event.target !== renameBox && event.target !== currentFriend) {
        renameBox.style.display = 'none';
    }
});

document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
        renameBox.style.display = 'none';
    }
});