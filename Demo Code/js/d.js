
updateAnglesFromTarget() {
    let currentEndEffector = this.robotBones[4].getWorldPosition();
    console.log(current end effector pos :, currentEndEffector);
    this.direction = currentEndEffector.clone().sub(this.origin.position).normalize();
    let normal = this.origin.normal.clone().normalize();
    console.log(n,normal,d :, this.direction);



    // Project target onto movement plane
    let targetPosition = this.target.position.clone();
    console.log(targetPos,targetPosition);
    let originPoint = this.origin.position.clone(); // A point on the plane

    // Compute the vector from origin to target
    let diff = targetPosition.clone().sub(originPoint);
    
    // Compute the projection length (dot product)
    let distanceToPlane = diff.dot(normal);
        let projectedTarget = targetPosition.clone().sub(normal.clone().multiplyScalar(distanceToPlane));
    
    console.log("Projected Target on Plane:", projectedTarget);

    // Compute new movement direction
    let direction_new = projectedTarget.clone().sub(this.origin.position).normalize();
    console.log('direction_new',direction_new);

    //Compute rotation angle θ0
    let dotProduct = this.direction.dot(direction_new);
    let crossProduct = new THREE.Vector3().crossVectors(this.direction, direction_new).dot(normal);
    let theta0 = Math.atan2(crossProduct, dotProduct);

    this.setAngle(0, theta0);

    // Define a Local Coordinate System
    let bAxis = normal.clone(); // B-axis is along normal
    let aAxis = direction_new.clone().sub(bAxis.clone().multiplyScalar(direction_new.clone().dot(bAxis))).normalize(); 

    let targetPoint = new THREE.Vector2(
        this.target.position.clone().sub(this.origin.position.clone()).dot(aAxis),
        this.target.position.clone().sub(this.origin.position.clone()).dot(bAxis)
    );

    let normalA = this.origin.normal.clone().normalize();
    let normalB = this.target.normal.clone().normalize();

    let crossAB = new THREE.Vector3().crossVectors(normalA, normalB);
    let angleEndEffector = Math.atan2(crossAB.dot(bAxis), normalA.dot(normalB));       

    if(angleEndEffector < 0){angleEndEffector += Math.PI *2}
    
    let angles = this.ik3R(targetPoint.y, targetPoint.x, this.offset, this.leg1, this.leg2, this.offset, angleEndEffector+Math.PI);

    this.setAngle(1, angles.theta1);
    this.setAngle(2, angles.theta2);
    this.setAngle(3, angles.theta3);

    this.robotGroup.updateMatrixWorld(true);
    console.log(this.robotBones[4].getWorldPosition())
}














    i think i know my biggest issue and error maybe, you tell me what you think:

I am trying to compute every angle from my current postion but as i am in a simulation i can just set every angle from zero everytime.

As i am regiving each joint a new solution i don't need to take the angle between old target and new one but just the angle from  origin to target no ?

    updateAnglesFromTarget() {
        let currentEndEffector = this.robotBones[4].getWorldPosition();
        console.log(current end effector pos :, currentEndEffector);
        this.direction = currentEndEffector.clone().sub(this.origin.position).normalize();
        let normal = this.origin.normal.clone().normalize();
        console.log(n,normal,d :, this.direction);

        // Ensure this.direction is always valid
        if (Math.abs(this.direction.dot(normal) - 1) < 1e-6) {  
            console.log(hhhahhahahhhhhahhh);
            if (normal.x > 0.9) this.direction.set(0, 0, -1);
            else if (normal.x < -0.9) this.direction.set(0, 0, 1);
            else if (normal.y > 0.9) this.direction.set(1, 0, 0);
            else if (normal.y < -0.9) this.direction.set(1, 0, 0);
            else if (normal.z > 0.9) this.direction.set(1, 0, 0);
            else if (normal.z < -0.9) this.direction.set(-1, 0, 0);
            console.log(n,normal,d :, this.direction);

        }

        // Project target onto movement plane
        let targetPosition = this.target.position.clone();
        console.log(targetPos,targetPosition);
        let originPoint = this.origin.position.clone(); // A point on the plane

        // Compute the vector from origin to target
        let diff = targetPosition.clone().sub(originPoint);
        
        // Compute the projection length (dot product)
        let distanceToPlane = diff.dot(normal);
        
        // Subtract the normal component to get the projection onto the plane
        let projectedTarget = targetPosition.clone().sub(normal.clone().multiplyScalar(distanceToPlane));
        
        console.log("Projected Target on Plane:", projectedTarget);

        // Compute new movement direction
        let direction_new = projectedTarget.clone().sub(this.origin.position).normalize();
        console.log('direction_new',direction_new);

        //Compute rotation angle θ0
        let dotProduct = this.direction.dot(direction_new);
        let crossProduct = new THREE.Vector3().crossVectors(this.direction, direction_new).dot(normal);
        let theta0 = Math.atan2(crossProduct, dotProduct);
        console.log(dotP,dotProduct,  corssP,crossProduct)
        console.log(theta0 ,theta0);

        this.setAngle(0, theta0);

        // Define a Local Coordinate System
        let bAxis = normal.clone(); // B-axis is along normal
        let aAxis = direction_new.clone().sub(bAxis.clone().multiplyScalar(direction_new.clone().dot(bAxis))).normalize(); 

        let targetPoint = new THREE.Vector2(
            this.target.position.clone().sub(this.origin.position.clone()).dot(aAxis),
            this.target.position.clone().sub(this.origin.position.clone()).dot(bAxis)
        );

        // console.log('target', this.target);

        let normalA = this.origin.normal.clone().normalize();
        // console.log('A',normalA);
        let normalB = this.target.normal.clone().normalize();
        // console.log('B',normalB);
        // console.log('target', this.target);

        // ✅ Project the normals into the A-B plane
        let normalA_proj = normalA.clone().sub(bAxis.clone().multiplyScalar(normalA.dot(bAxis))).normalize();
        let normalB_proj = normalB.clone().sub(bAxis.clone().multiplyScalar(normalB.dot(bAxis))).normalize();

        // ✅ Compute the signed angle in the A-B plane
        let crossAB = new THREE.Vector3().crossVectors(normalA, normalB);
        let angleEndEffector = Math.atan2(crossAB.dot(bAxis), normalA.dot(normalB));       
        //  console.log('angleEndEffector',angleEndEffector* 180 / Math.PI);

        if(angleEndEffector < 0){angleEndEffector += Math.PI *2}
        // if(this.origin.normal.x == this.target.normal.x && this.origin.normal.y == this.target.normal.y && this.origin.normal.z == this.target.normal.z){ angleEndEffector = Math.PI;}
        // if(this.origin.normal.x == -this.target.normal.x && this.origin.normal.y == -this.target.normal.y && this.origin.normal.z == -this.target.normal.z){ angleEndEffector =0;}
        let angles = this.ik3R(targetPoint.y, targetPoint.x, this.offset, this.leg1, this.leg2, this.offset, angleEndEffector+Math.PI);
        // console.log('angles',angles);
        // Apply IK Angles
        this.setAngle(1, angles.theta1);
        this.setAngle(2, angles.theta2);
        this.setAngle(3, angles.theta3);

        this.robotGroup.updateMatrixWorld(true);
        console.log(this.robotBones[4].getWorldPosition())
    }