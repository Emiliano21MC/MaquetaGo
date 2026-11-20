import {useMemo} from 'react';
import {View,Image} from 'react-native';
import {SvgXml} from 'react-native-svg';
import {create} from 'qrcode/lib/core/qrcode';
import {render} from 'qrcode/lib/renderer/svg-tag';
export function YapeQrCode({payload}:{payload:string}){
 const xml=useMemo(()=>render(create(payload,{errorCorrectionLevel:'H'}),{margin:4,width:224,color:{dark:'#0F2537',light:'#FFFFFF'}}),[payload]);
 return <View accessibilityLabel="Código QR Yape del comercio" style={{padding:10,borderRadius:20,borderWidth:1,borderColor:'#E2D9E8',backgroundColor:'white'}}>
  <SvgXml xml={xml} width={224} height={224}/>
  <View pointerEvents="none" style={{position:'absolute',alignSelf:'center',top:'43%',width:32,height:32,borderRadius:10,backgroundColor:'#742284',borderWidth:3,borderColor:'white',alignItems:'center',justifyContent:'center'}}><Image source={require('../../assets/images/yape-logo.png')} style={{width:24,height:24,borderRadius:6}}/></View>
  {[{top:0,left:0,borderTopWidth:3,borderLeftWidth:3},{top:0,right:0,borderTopWidth:3,borderRightWidth:3},{bottom:0,left:0,borderBottomWidth:3,borderLeftWidth:3},{bottom:0,right:0,borderBottomWidth:3,borderRightWidth:3}].map((corner,i)=><View key={i} pointerEvents="none" style={[{position:'absolute',width:22,height:22,borderColor:'#742284',borderRadius:5},corner]}/>)}
 </View>;
}
