import {
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import React, {useEffect, useRef, useState} from 'react';
import {useIsFocused, useNavigation} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import Header from '../../../components/Header';
import {COLORS, FONTS, ICONS, SIZES} from '../../../utils/themes';
import normalize from '../../../utils/normalize';
import Chat from '../../../components/Chat';
import ChatInput from '../../../components/ChatInput';
import moment from 'moment';
import ImagePicker from 'react-native-image-crop-picker';
import RBSheet from 'react-native-raw-bottom-sheet';
import CustomButton from '../../../components/CustomButton';
import connectionrequest from '../../../utils/netInfo';
import {
  chatRoomCreateRequest,
  myChatsRequest,
  sendAttachmentReq,
} from '../../../redux/reducers/ChatReducer';
import showErrorAlert from '../../../utils/toast';
import Skeleton from '../../../components/Skeleton';
import createSocketConnection from '../../../utils/socketInstance';
import constants from '../../../utils/constants';
import ReactNativeModal from 'react-native-modal';

let status = '';

const Inbox = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const isFocused = useIsFocused();
  const flatListRef = useRef(null);
  const refRBSheet = useRef();

  const AuthReducer = useSelector(state => state?.AuthReducer);
  const ChatReducer = useSelector(state => state?.ChatReducer);

  const [message, setMessage] = useState('');
  const [chatList, setChatList] = useState([]);
  const [image, setImage] = useState(null);
  const [msgImage, setMessageImg] = useState(null);
  const [file, setFile] = useState(null);
  const [pageNo, setPageNo] = useState(1);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [loader, setLoader] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);

  let socket = createSocketConnection(AuthReducer?.token);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setIsKeyboardOpen(true);
      },
    );

    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setIsKeyboardOpen(false);
      },
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  useEffect(() => {
    const unSub = navigation.addListener('focus', () => {
      connectionrequest()
        .then(() => {
          dispatch(chatRoomCreateRequest());
        })
        .catch(() => {
          showErrorAlert('Please check your internet connection!');
        });
    });

    return unSub;
  }, []);

  useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected', ChatReducer?.chatRoomCreateResponse?.data?._id);
    });

    socket.on(`${ChatReducer?.chatRoomCreateResponse?.data?._id}msg`, res => {
      console.log('Listening From Admin-->', res);

      setChatList(prevState => [...prevState, res]);

      setTimeout(() => {
        flatListRef?.current?.scrollToEnd({
          animated: true,
        });
      }, 500);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected');
    });
  }, [ChatReducer?.chatRoomCreateResponse?.data?._id]);

  const onAttachmentPress = () => {
    refRBSheet.current.open();
  };

  const handleFileView = file => {
    setFile(constants.CHAT_FILE_URL + file);
    setIsModalVisible(true);
  };

  const setImagePath = async pickerType => {
    if (pickerType === 'delete') {
      if (image !== null) {
        setImage(null);
      } else {
        console.log('No image to delete!');
      }
    } else {
      const a =
        pickerType == 'camera'
          ? setTimeout(() => imagePickerCamera(), 1000)
          : setTimeout(() => imagePickerGallery(), 1000);
      a.then(path => {
        setImage(path);
      }).catch(error => {
        showErrorAlert(
          'Something wrong !',
          'Please check your internet connection',
        );
      });
    }
  };

  const imagePickerCamera = async (type = null) => {
    ImagePicker.openCamera({
      width: 300,
      height: 400,
      cropping: true,
    }).then(image => {
      let arr = image.path.split('/');
      let getOriginalname = arr[arr.length - 1];
      let imageObj = {
        name: getOriginalname,
        type: image.mime,
        uri:
          Platform.OS === 'android'
            ? image.path
            : image.path.replace('file://', ''),
      };
      setMessageImg(imageObj);
      refRBSheet.current.close();

      let fileData = new FormData();
      fileData.append(
        'room_id',
        ChatReducer?.chatRoomCreateResponse?.data?._id,
      );
      fileData.append('files[0]', imageObj);

      connectionrequest()
        .then(() => {
          dispatch(sendAttachmentReq(fileData));
        })
        .catch(() => {
          showErrorAlert('Please check your internet connection!');
        });
    });
  };

  const imagePickerGallery = async (type = null) => {
    ImagePicker.openPicker({
      width: 300,
      height: 400,
      cropping: true,
    }).then(image => {
      let arr = image.path.split('/');
      let getOriginalname = arr[arr.length - 1];
      let imageObj = {
        name: getOriginalname,
        type: image.mime,
        uri:
          Platform.OS === 'android'
            ? image.path
            : image.path.replace('file://', ''),
      };
      setMessageImg(imageObj);

      refRBSheet.current.close();

      let fileData = new FormData();
      fileData.append(
        'room_id',
        ChatReducer?.chatRoomCreateResponse?.data?._id,
      );
      fileData.append('files[0]', imageObj);

      connectionrequest()
        .then(() => {
          dispatch(sendAttachmentReq(fileData));
        })
        .catch(() => {
          showErrorAlert('Please check your internet connection!');
        });
    });
  };

  const onSend = () => {
    if (message.trim().length > 0) {
      socket.emit('send_message', {
        room_id: ChatReducer?.chatRoomCreateResponse?.data?._id,
        message: message.trim(),
      });

      setMessage('');

      setTimeout(() => {
        flatListRef?.current?.scrollToEnd({
          animated: true,
        });
      }, 500);
    }
  };

  const formatDateTime = dateTime => {
    const messageDate = moment(dateTime);
    const messageTime = moment(dateTime);
    const now = moment();

    if (
      messageDate.isSame(now, 'day') &&
      messageTime.isSameOrAfter(now.subtract(1, 'minute'))
    ) {
      return 'Just now';
    } else if (messageDate.isSame(now, 'day')) {
      return `Today, ${messageTime.format('HH:mm a')}`;
    } else {
      return `${messageDate.format('dddd')}, ${messageTime.format('HH:mm a')}`;
    }
  };

  const RenderChat = ({item, index}) => {
    const formattedDateTime = formatDateTime(item?.createdAt);
    const userType =
      item?.sender_id === AuthReducer?.profileResponse?.data?._id
        ? 'user'
        : 'support';

    return (
      <Chat
        index={index}
        userType={userType}
        message={item?.message}
        attachment={item?.files?.[0]?.file}
        messageType={item?.type}
        dateTime={formattedDateTime}
        onPressFile={() => handleFileView(item?.files?.[0]?.file)}
      />
    );
  };

  useEffect(() => {
    if (status == '' || ChatReducer.status != status) {
      switch (ChatReducer.status) {
        case 'Chat/chatRoomCreateRequest':
          status = ChatReducer.status;
          setLoader(true);
          break;
        case 'Chat/chatRoomCreateSuccess':
          status = ChatReducer.status;
          let obj = {
            room_id: ChatReducer?.chatRoomCreateResponse?.data?._id,
            page_limit: 10000,
            page_no: pageNo,
          };
          dispatch(myChatsRequest(obj));
          break;
        case 'Chat/chatRoomCreateFailure':
          status = ChatReducer.status;
          setLoader(false);
          break;

        case 'Chat/myChatsRequest':
          status = ChatReducer.status;
          setLoader(true);
          break;
        case 'Chat/myChatsSuccess':
          status = ChatReducer.status;
          setLoader(false);
          setPageNo(ChatReducer?.myChatsResponse?.data?.pages);
          setChatList(ChatReducer?.myChatsResponse?.data?.docs);

          setTimeout(() => {
            flatListRef?.current?.scrollToEnd({
              animated: true,
            });
          }, 2000);
          break;
        case 'Chat/myChatsFailure':
          status = ChatReducer.status;
          setLoader(false);
          break;

        case 'Chat/sendAttachmentReq':
          status = ChatReducer.status;
          break;
        case 'Chat/sendAttachmentSuccess':
          status = ChatReducer.status;
          let attch = {};
          attch.sender_id = ChatReducer?.sendAttachmentRes?.data?.sender_id;
          attch.receiver_id = ChatReducer?.sendAttachmentRes?.data?.receiver_id;
          attch.chat_room_id =
            ChatReducer?.sendAttachmentRes?.data?.chat_room_id;
          attch.createdAt = ChatReducer?.sendAttachmentRes?.data?.createdAt;
          attch.type = ChatReducer?.sendAttachmentRes?.data?.type;
          attch.message = ChatReducer?.sendAttachmentRes?.data?.message;
          attch.files = ChatReducer?.sendAttachmentRes?.data?.files;

          let tempList = [...chatList];
          tempList.push(attch);

          setChatList(tempList);
          setMessageImg(null);

          setTimeout(() => {
            flatListRef?.current?.scrollToEnd({
              animated: true,
            });
          }, 500);
          break;
        case 'Chat/sendAttachmentFailure':
          status = ChatReducer.status;
          break;
      }
    }
  }, [ChatReducer.status]);

  if (AuthReducer?.token === null) {
    return (
      <SafeAreaView
        style={[styles.parentWrapper, {backgroundColor: 'rgba(0, 0,0,0.6)'}]}>
        {isFocused && <StatusBar barStyle={'dark-content'} />}

        <View style={styles.bodyWrapper}>
          <Header headerTitle={'CarGOGO Support'} />

          <View style={styles.toastWrapper}>
            <Text style={styles.headerText}>Access Restricted</Text>
            <Text style={styles.toastText}>
              You need to be logged in to use this feature. Please sign in to
              continue.
            </Text>
            <CustomButton
              onPress={() => navigation.navigate('Signin')}
              title={'Login'}
              color={COLORS.white}
              backgroundColor={COLORS.black}
              buttonWidth={'60%'}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.parentWrapper}>
      {isFocused && <StatusBar barStyle={'dark-content'} />}

      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={-normalize(40)}>
        <View style={styles.bodyWrapper}>
          <Header headerTitle={'CarGOGO Support'} />

          {loader ? (
            <Skeleton chat={true} />
          ) : (
            <FlatList
              ref={flatListRef}
              bounces={false}
              showsVerticalScrollIndicator={false}
              data={chatList}
              keyExtractor={(_, index) => index.toString()}
              renderItem={RenderChat}
              style={styles.chatWrapper}
              contentContainerStyle={styles.chatBottomGap}
              ListEmptyComponent={
                <View style={styles.emptyListWrapper}>
                  <Text style={styles.emptyListText}>
                    No messages yet. Start messaging!
                  </Text>
                </View>
              }
              ListFooterComponent={<View style={{height: normalize(130)}} />}
            />
          )}

          {msgImage && (
            <View style={styles.imageWrapper}>
              <Image
                source={{uri: msgImage.uri}}
                style={styles.image}
                resizeMode={'contain'}
              />
            </View>
          )}

          <ChatInput
            onAttachmentPress={onAttachmentPress}
            onSend={onSend}
            message={message}
            setMessage={setMessage}
            isKeyboardOpen={isKeyboardOpen}
          />
        </View>
      </KeyboardAvoidingView>

      <RBSheet
        ref={refRBSheet}
        closeOnDragDown={true}
        closeOnPressMask={true}
        onClose={pickerType => pickerType && setImagePath(pickerType)}
        closeDuration={500}
        customStyles={{
          wrapper: {
            backgroundColor: 'rgba(0,0,0,0.5)',
          },
          draggableIcon: {
            backgroundColor: COLORS.black,
          },
          container: {
            backgroundColor: COLORS.white,
            borderTopLeftRadius: normalize(20),
            borderTopRightRadius: normalize(20),
          },
        }}>
        <View style={styles.btnsWrapper}>
          <Pressable
            style={styles.btnStyle}
            onPress={() => imagePickerCamera()}>
            <Text style={styles.btnText}>Select From Camera</Text>
          </Pressable>

          <Pressable
            style={styles.btnStyle}
            onPress={() => imagePickerGallery()}>
            <Text style={styles.btnText}>Select From Gallery</Text>
          </Pressable>
        </View>
      </RBSheet>

      <View>
        <ReactNativeModal
          isVisible={isModalVisible}
          style={styles.bottomSheetView}>
          <View style={styles.bottomSheetWrapper}>
            <Pressable
              onPress={() => setIsModalVisible(false)}
              style={styles.crossWrapper}>
              <Image source={ICONS.circledCross} style={styles.cross} />
            </Pressable>
            <Image source={{uri: file}} style={styles.chatImage} />
          </View>
        </ReactNativeModal>
      </View>
    </SafeAreaView>
  );
};

export default Inbox;

const styles = StyleSheet.create({
  parentWrapper: {
    flex: 1,
    backgroundColor: COLORS.offwhite,
  },
  bodyWrapper: {
    paddingHorizontal: normalize(15),
    paddingTop: normalize(5),
    flex: 1,
  },
  chatWrapper: {
    marginTop: normalize(20),
  },
  chatBottomGap: {
    gap: normalize(15),
  },
  btnsWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  btnStyle: {
    backgroundColor: COLORS.black,
    width: '80%',
    height: normalize(50),
    borderRadius: normalize(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: COLORS.white,
    fontFamily: FONTS.JAKARTA_SANS_MEDIUM,
    fontSize: normalize(12),
  },
  imageWrapper: {
    width: '100%',
    height: normalize(150),
    alignSelf: 'center',
    justifyContent: 'center',
    position: 'absolute',
    bottom:
      Platform.OS === 'android'
        ? normalize(175)
        : SIZES.height <= 736
        ? normalize(155)
        : normalize(125),
    backgroundColor: COLORS.white,
    borderRadius: normalize(10),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  image: {
    width: '100%',
    height: '90%',
    borderRadius: normalize(10),
  },
  bottomSheetView: {
    position: 'absolute',
    bottom: -normalize(20),
  },
  bottomSheetWrapper: {
    width: SIZES.width,
    height: normalize(400),
    marginLeft: -normalize(15),
    padding: normalize(20),
    backgroundColor: '#fff',
    borderTopLeftRadius: normalize(30),
    borderTopRightRadius: normalize(30),
    gap: normalize(15),
  },
  crossWrapper: {
    position: 'absolute',
    top: -normalize(40),
    alignSelf: 'center',
  },
  cross: {
    width: normalize(25),
    height: normalize(25),
  },
  chatImage: {
    width: '100%',
    height: '100%',
    alignSelf: 'center',
    resizeMode: 'contain',
  },
  cancelImageWrapper: {
    position: 'absolute',
    alignSelf: 'center',
    top: normalize(2),
    right: normalize(70),
    zIndex: 99,
  },
  cancelImage: {
    width: normalize(20),
    height: normalize(20),
  },
  toastWrapper: {
    width: '100%',
    alignSelf: 'center',
    backgroundColor: COLORS.white,
    borderRadius: normalize(10),
    padding: normalize(15),
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: SIZES.height / 3.5,
    gap: normalize(20),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerText: {
    fontFamily: FONTS.JAKARTA_SANS_BOLD,
    fontSize: normalize(16),
    color: COLORS.black,
  },
  toastText: {
    fontFamily: FONTS.JAKARTA_SANS_BOLD,
    fontSize: normalize(14),
    color: COLORS.black,
    textAlign: 'center',
    lineHeight: normalize(20),
  },
  emptyListWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyListText: {
    fontFamily: FONTS.JAKARTA_SANS_MEDIUM,
    fontSize: normalize(12),
    color: COLORS.placeholderTextInput,
    marginTop: normalize(20),
  },
});
