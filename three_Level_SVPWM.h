#ifndef  __THREE_LEVEL_SVPWM_H
#define  __THREE_LEVEL_SVPWM_H

/*  
带sin cos的运算用28379D内的TMU的内联汇编函数
等幅值变换的clarke变换推导(矩阵系数是2/3)
调制比m=√3Vref/Udc(Vref是相电压的幅值)
Vref=m*Udc/√3*/
#include "three_Level_SVPWM_config.h"

#include <stdint.h>

typedef uint16_t SwitchState;

//开关状态
#define P  ((SwitchState)0)  // 上两管导通
#define O  ((SwitchState)1)  // 中间两管导通  
#define N  ((SwitchState)2)  // 下两管导通
#define default_value  ((SwitchState)3) //默认值

//调制比m和角度angle都是来自上一层闭环控制的结果,是实时量,不是结构体内的成员变量
typedef struct{
    float Udc;
    float Ts;
    float Time_sequence[7]; //七段式开关状态对应的时间分配
    SwitchState A_PHASE_STATE[7]; //A相七段式开关状态
    SwitchState B_PHASE_STATE[7]; //B相七段式开关状态
    SwitchState C_PHASE_STATE[7]; //C相七段式开关状态
    #ifdef ENABLE_NEUTRAL_POINT_BALANCE
    float Udc1; //上电容电压
    float Udc2; //下电容电压
    float k;    //中点平衡的时间调整系数
    #endif //ENABLE_NEUTRAL_POINT_BALANCE
}SVPWM_structure;

#define Q15_SCALE 32768

#define DEG_TO_RAD(degrees)  ((degrees) * M_PI / 180.0f)

#define FLOAT_TO_Q15(f) ((int16)((f) * Q15_SCALE))

#define d2r60pu_q15 5461 //60度对应弧度制的标幺值的Q15值
#define inv_2pi  0.15915494309189f //1/2π
#define pi 3.14159265358979f       //π
#define two_pi 6.28318530717958f   //2π
#define pi_DIV_3 1.04719755119660f //π/3
#define inv_pi_DIV3 0.954929658551372f  //1/(π/3)
#define pi_DIV_6 0.52359877559830f //π/6

#define inv_SQRT_3 0.577350269189625f //1/√3
#define SQRT_3 1.73205080756887729352f    //√3
#define SQRT_3_DIV_2 0.866025403784438f //√3/2
#define SQRT_3_DIV_4 0.433012701892219f   //√3/4
#define SQRT_3_DIV_3 0.577350269189625f   //√3/3
#define SQRT_3_DIV_6 0.288675134594812f   //√3/6


static inline void SET_7SEG_TIME(SVPWM_structure* svpwm,
                                 float T1, float T2, float T3){
#ifdef ENABLE_NEUTRAL_POINT_BALANCE
    svpwm->Time_sequence[0] = T1 * (1.0f - svpwm->k) * 0.25f;
    svpwm->Time_sequence[1] = T2 * 0.5f;
    svpwm->Time_sequence[2] = T3 * 0.5f;
    svpwm->Time_sequence[3] = T1 * (1.0f + svpwm->k) * 0.5f;
    svpwm->Time_sequence[4] = T3 * 0.5f;
    svpwm->Time_sequence[5] = T2 * 0.5f;
    svpwm->Time_sequence[6] = T1 * (1.0f - svpwm->k) * 0.25f;
#else
    svpwm->Time_sequence[0] = T1 * 0.25f;
    svpwm->Time_sequence[1] = T2 * 0.5f;
    svpwm->Time_sequence[2] = T3 * 0.5f;
    svpwm->Time_sequence[3] = T1 * 0.5f;
    svpwm->Time_sequence[4] = T3 * 0.5f;
    svpwm->Time_sequence[5] = T2 * 0.5f;
    svpwm->Time_sequence[6] = T1 * 0.25f;
#endif
}

//按照七段式对某相桥臂进行开关状态分配
#define SET_7SEG_STATE(xphase_state_seq, s0, s1, s2, s3, s4, s5, s6)    \
do{                                                                     \
    (xphase_state_seq)[0] = (s0);                                       \
    (xphase_state_seq)[1] = (s1);                                       \
    (xphase_state_seq)[2] = (s2);                                       \
    (xphase_state_seq)[3] = (s3);                                       \
    (xphase_state_seq)[4] = (s4);                                       \
    (xphase_state_seq)[5] = (s5);                                       \
    (xphase_state_seq)[6] = (s6);                                       \
}while(0)

static inline void THREE_LEVEL_SVPWM_INIT(SVPWM_structure* svpwm, float Udc_value, float Ts_value)
{
    svpwm->Udc = Udc_value;
    svpwm->Ts = Ts_value;
    for(int i = 0; i < 7; i++){
        svpwm->Time_sequence[i] = 0.0f;
        svpwm->A_PHASE_STATE[i] = default_value;
        svpwm->B_PHASE_STATE[i] = default_value;
        svpwm->C_PHASE_STATE[i] = default_value;
    }
        #ifdef ENABLE_NEUTRAL_POINT_BALANCE
        svpwm->Udc1 = 0.0f;
        svpwm->Udc2 = 0.0f;
        svpwm->k = 0.0f;
        #endif //ENABLE_NEUTRAL_POINT_BALANCE
}

//分配七段式时间和分配七段式状态
void THREE_LEVEL_SVPWM_TimeState_Allocation_TimeAndState(SVPWM_structure* svpwm, int16 Major_Sector, 
                                                         int16 Minor_Sector, float Ta, float Tb, float Tc);



/*
m是调制比 通过闭环控制去控制Vref
angle是参考电压矢量的角度(锁相环出来后经过处理的)范围在浮点数[0,2π]
Vref=m*Udc/√3
但总体算法是标幺化处理了 不会出现Udc进行运算
这个Udc只做未来扩展用,实际算法暂时不需要Udc,但是由于可读性考虑还是保留了
最终在代码内部改变28379D内epwm的比较值
m和angle是THREE_LEVEL_SVPWM_PROCESS函数的输入参数 
且m的范围是0~1 angle的范围是0~2π,这些已经在上一层函数的输出侧做限制了,所以这里不再做限制处理
*/
void THREE_LEVEL_SVPWM_PROCESS(SVPWM_structure* svpwm, float m, float angle);

/*
Udc1上电容电压  Udc2是下电容电压 k用来调整小矢量的时间分配比例 这些变量都在结构体内
这个函数用来实现中点电位平衡
*/
void THREE_LEVEL_SVPWM_NEUTRAL_POINT_BALANCE(SVPWM_structure* svpwm);

#endif /* __THREE_LEVEL_SVPWM_H */

